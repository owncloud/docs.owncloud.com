package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"text/template"
	"gopkg.in/yaml.v2"
)

// info: yamlExtendedSource and backupFile are defined in read_env_file.go

// note that the exclude paths are written in "find" style !!
const exclude_paths = "-! -path '*/vendor/*' -! -path '*/tests/*' -! -path '*/tools/*' -! -path '*/internal/*'"

// the locale the search below runs with, pinned to get output independent of the user environment
const localeEnv = "LC_ALL=C"

// ConfigVars is the main yaml source
type ConfigVars struct {
	Variables []Variable `yaml:"variables"`
}

// Variable contains all information about one rogue envvar
type Variable struct {
	// These field structs are automatically filled:
	// RawName can be the name of the envvar or the name of its var
	RawName string `yaml:"rawname"`
	// Path to the envvar with linenumber
	Path string `yaml:"path"`
	// FoundInCode indicates if the variable is still found in the codebase. TODO: delete immediately?
	FoundInCode bool `yaml:"foundincode"`
	// Name is equal to RawName but will not be overwritten in consecutive runs
	Name string `yaml:"name"`

	// These field structs need manual filling:
	// Type of the envvar
	Type string `yaml:"type"`
	// DefaultValue of the envvar
	DefaultValue string `yaml:"default_value"`
	// Description of what this envvar does
	Description string `yaml:"description"`
	// Ignore this envvar when creating docs?
	Ignore bool `yaml:"do_ignore"`

	// For simplicity ignored for now:
	// DependendServices []Service `yaml:"dependend_services"`
}

// GetRogueEnvs extracts the rogue envs from the code
// These envvars ARE NOT DEFINED in any service and are gathered via os.GetEnv
func GetRogueEnvs() {

	ReadEnv()
	fmt.Printf(Green + "Update or generate the %s file\n\n" + Reset, yamlExtendedSource)
	doRogue()
	
	fmt.Printf(Yellow + "You MUST manually check the .yaml file before run/re-run 'extended'\n\n" + Reset)

	RemoveOutputDir()
}

func doRogue() {

	var err error

	targetFolder := filepath.Join(services_dir, persistent_files)

	// create target folder if not exists
	err = os.MkdirAll(targetFolder, Env.folder_mode)
	if err != nil {
		fatal(err)
	}

	fullYamlPath := filepath.Join(targetFolder, yamlExtendedSource)
	re := regexp.MustCompile(`os.Getenv\(([^\)]+)\)`)
	vars := &ConfigVars{}

	_, err = os.Stat(fullYamlPath)
	if err != nil {
	    fmt.Printf("File does not exist, try to copy from backup: %s", fullYamlPath)
		err = CopyFile(backupFile, fullYamlPath)
		if err != nil {
		    fmt.Printf("Copy from backup failed, recreating from scratch: %s\n", fullYamlPath)
		} else {
			fmt.Printf("  - success\n")
		}
	}

	fmt.Printf("Try reading existing variable definitions from %s", fullYamlPath)

	yfile, err := os.ReadFile(fullYamlPath)
	if err == nil {
		err = yaml.Unmarshal(yfile, &vars)
		if err != nil {
			fatal(err)
		} else {
			fmt.Printf(" - success\n")
		}
	}

	if Env.isVerbose {
		fmt.Printf("Processing directory: %s\n", Env.ocis_dir)
	}


	// Old command `grep -RHn os.Getenv $DIR --exclude-dir=vendor | grep -v extendedEnv.go | grep \\.go`
	// New command, 10x faster than direct grep:
	// 	find %s -type f -name '*.go' - Finds all .go files in the specified directory
	// 	xargs -0 -P $(getconf _NPROCESSORS_ONLN) - Processes files in parallel using all available CPU cores
	// 	grep -F -Hn 'os.Getenv' - Searches for literal "os.Getenv" with filename and line number output
	// note that the locale is pinned to C for consistent output via the environment below and not
	// as a prefix assignment inside the string, which would only apply to 'find' and not to the greps
	grepCmd := fmt.Sprintf("find %s -type f -name '*.go' %s -print0 | xargs -0 -P $(getconf _NPROCESSORS_ONLN) grep -F -Hn 'os.Getenv' | grep -v extendedEnv.go", Env.ocis_dir, exclude_paths)

	if Env.isVerbose {
		fmt.Printf("%s %s\n", localeEnv, grepCmd)
	}

	cmd := exec.Command("sh", "-c", grepCmd)

	// pin the locale for the shell and every command of the pipeline it starts
	cmd.Env = append(os.Environ(), localeEnv)

	out, err := cmd.Output()
	if err != nil {
		fatal(err)
	}

	lines := strings.Split(string(out), "\n")

	// find current vars
	currentVars := make(map[string]Variable)
	totalLines := len(lines)

	if Env.isVerbose {
		fmt.Printf("Processing %d lines...\n", totalLines)
	}

	for _, l := range lines {

		if l == "" {
			continue
		}

		if Env.isVerbose {
			fmt.Printf("Parsing %s\n", l)
		}

		r := strings.SplitN(l, ":", 3)
		if len(r) != 3 || r[0] == "" || r[2] == "" {
			continue
		}

		// Remove ./ prefix from path if it exists
		path := strings.TrimPrefix(r[0], "./")
		path = path + ":" + r[1] // Reconstruct path:line
		content := r[2]

		res := re.FindAllSubmatch([]byte(content), -1)
		if len(res) < 1 {

			if Env.isVerbose {
				fmt.Printf("  No envvar found in content: %s\n", content)
			}
			continue
		}

		for _, m := range res {
			name := strings.Trim(string(m[1]), "\"")

			if Env.isVerbose {
				fmt.Printf("  Found envvar: %s at %s\n", name, path)
			}

			currentVars[path+name] = Variable{
				RawName:     name,
				Path:        path,
				FoundInCode: true,
				Name:        name,
			}
		}
	}

	if Env.isVerbose {
		fmt.Printf("Found %d current variables\n", len(currentVars))
	}

	// adjust existing vars
	for i, v := range vars.Variables {
		_, ok := currentVars[v.Path+v.RawName]
		if !ok {
			vars.Variables[i].FoundInCode = false
			continue
		}

		vars.Variables[i].FoundInCode = true
		delete(currentVars, v.Path+v.RawName)
	}

	// add new envvars
	for _, v := range currentVars {
		vars.Variables = append(vars.Variables, v)
	}

	less := func(i, j int) bool {
		return vars.Variables[i].Name < vars.Variables[j].Name
	}

	sort.Slice(vars.Variables, less)

	output, err := yaml.Marshal(vars)
	if err != nil {
		fatal(err)
	}

	fmt.Printf("Writing new variable definitions to %s\n\n", fullYamlPath)
	err = os.WriteFile(fullYamlPath, output, Env.file_mode)
	if err != nil {
		fatalf("could not write %s", fullYamlPath)
	}
}

// RenderRogueEnvsTemplate renders the global vars template sourced from GetRogueEnvs
func RenderRogueEnvs() {

	ReadEnv()
	fmt.Printf(Green + "Generate the extended_configvars.adoc file (folder envvars)\n\n" + Reset)
	doRenderRogue()
	RemoveOutputDir()
}

func doRenderRogue() {

	var err error

	sourceFolder := filepath.Join(Env.services_dir, persistent_files)
	targetFolder := filepath.Join(Env.services_dir, extended_files)

	// create target folder if not exists
	err = os.MkdirAll(targetFolder, Env.folder_mode)
	if err != nil {
		fatal(err)
	}

	fullYamlPath := filepath.Join(sourceFolder, yamlExtendedSource)

	_, err = os.Stat(fullYamlPath)
	if err != nil {
		fmt.Printf(Cyan + "The required file: " + Reset + "%s " + Cyan + "does not exist\n" + Reset, fullYamlPath)
		fmt.Printf(Cyan + "You must run 'rogue' first\n\n" + Reset)
		exitCleanly(1)
	}

	content, err := os.ReadFile("./templates/ADOC_extended.tmpl")
	if err != nil {
		fatal(err)
	}

	vars := &ConfigVars{}
	fmt.Printf("Reading existing variable definitions from %s\n\n", fullYamlPath)
	yfile, err := os.ReadFile(fullYamlPath)
	if err != nil {
		fatal(err)
	}
	err = yaml.Unmarshal(yfile, &vars)
	if err != nil {
		fatal(err)
	}
	

	targetFile, err := os.Create(filepath.Join(targetFolder, "extended_configvars.adoc"))
	if err != nil {
		fatalf("Failed to create target file: %s", err)
	}
	defer targetFile.Close()

	tpl := template.Must(template.New("").Parse(string(content)))
	if err = tpl.Execute(targetFile, *vars); err != nil {
		fatalf("Failed to execute template: %s", err)
	}
}
