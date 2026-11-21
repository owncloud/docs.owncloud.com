package main

import (
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"text/template"
)

// Render the envvars that origin in services
func RenderServices() {

	ReadEnv()
	fmt.Printf(Green + "Generate envvar .adoc tables and yaml examples from services and the %s file\n\n" + Reset, yamlServiceSource)

	// save the current env_vars.yaml before it gets overwritten so we can compare afterwards
	envVarsFilePath := filepath.Join(Env.services_dir, persistent_files, yamlServiceSource)
	oldContent, oldErr := os.ReadFile(envVarsFilePath)

	doTemplates()

	// report any introductionVersion changes between the old and newly written file
	if oldErr == nil {
		reportIntroVersionChanges(envVarsFilePath, oldContent)
	}

	RemoveOutputDir()

}

// finally do the templating stuff
func doTemplates() {

	/*
	  renders:
	  1. adoc files for envvars in services
	  2. yaml files for envvars in services
	  3. the env_var.yaml file
	*/
	var targets = map[string]string{
		"templates/adoc-generator.go.tmpl":                 output_dir + "adoc/adoc-generator.go",
		"templates/example-yaml-config-generator.go.tmpl":  output_dir + "exampleconfig/example-yaml-config-generator.go",
		"templates/envar-db-table.go.tmpl":                 output_dir + "env/envvar-db-table.go",
	}

	paths, err := filepath.Glob(Env.ocis_dir + "services/*/pkg/config/defaults/defaultconfig.go")
	if err != nil {
		fatal(err)
	}
	replacer := strings.NewReplacer(
		ocis_dir, "github.com/owncloud/ocis/v2/",
		"/defaultconfig.go", "",
	)
	for i := range paths {
		paths[i] = replacer.Replace(paths[i])
	}

	for template, output := range targets {
		generateIntermediateCode(template, output, paths)
		runIntermediateCode(output)
	}

}

func generateIntermediateCode(templatePath string, intermediateCodePath string, paths []string) {

	var err error

	content, err := os.ReadFile(templatePath)
	if err != nil {
		fatal(err)
	}

	fmt.Println("Generating intermediate go code for " + intermediateCodePath + " using template " + templatePath)
	tpl := template.Must(template.New("").Parse(string(content)))

	err = os.MkdirAll(path.Dir(intermediateCodePath), Env.folder_mode)
	if err != nil {
		fatal(err)
	}
	runner, err := os.Create(intermediateCodePath)
	if err != nil {
		fatal(err)
	}
	err = os.Chmod(intermediateCodePath, Env.file_mode)
	if err != nil {
		fatal(err)
	}
	err = tpl.Execute(runner, paths)
	if err != nil {
		fatal(err)
	}
}

func runIntermediateCode(intermediateCodePath string) {
	fmt.Println("Running intermediate go code for " + intermediateCodePath)
	defaultConfigPath := "/etc/ocis"
	defaultDataPath := "/var/lib/ocis"
	os.Setenv("OCIS_BASE_DATA_PATH", defaultDataPath)
	os.Setenv("OCIS_CONFIG_DIR", defaultConfigPath)

	// Set AUTOMEMLIMIT_EXPERIMENT=system on non-Linux systems to avoid cgroups errors
	if runtime.GOOS != "linux" {
		os.Setenv("AUTOMEMLIMIT_EXPERIMENT", "system")
	}

	// copy the required go file to the template code
	envFileDir := path.Dir(intermediateCodePath)
	envFileDst := path.Join(envFileDir, "read_env_file.go")
	envFileSrc, err := os.ReadFile("read_env_file.go")
	if err != nil {
		fatal(err)
	}
	err = os.WriteFile(envFileDst, envFileSrc, Env.file_mode)
	if err != nil {
		fatal(err)
	}

	out, err := exec.Command("go", "run", intermediateCodePath, envFileDst).CombinedOutput()
	if err != nil {
		fatal(string(out), err)
	}
	fmt.Println(string(out))
}

// reportIntroVersionChanges compares the introductionVersion of each envvar in the
// newly written env_vars.yaml against the content saved before the services run.
// If any values changed they are shown and the user is asked to keep or revert them.
func reportIntroVersionChanges(envVarsPath string, oldContent []byte) {

	oldList, err := parseEnvVars(oldContent)
	if err != nil {
		fmt.Printf(Yellow + "Could not parse previous env_vars.yaml for comparison: %v\n\n" + Reset, err)
		return
	}
	newList, err := loadEnvVars(envVarsPath)
	if err != nil {
		fmt.Printf(Yellow + "Could not read new env_vars.yaml for comparison: %v\n\n" + Reset, err)
		return
	}

	type change struct {
		key    string
		oldVer string
		newVer string
	}
	var changes []change
	for _, key := range newList.keys {
		newVal := newList.values[key]
		if oldVal, ok := oldList.values[key]; ok {
			if oldVal.IntroductionVersion != newVal.IntroductionVersion {
				changes = append(changes, change{key, oldVal.IntroductionVersion, newVal.IntroductionVersion})
			}
		}
	}

	if len(changes) == 0 {
		return
	}

	fmt.Printf(Yellow + "\nThe introductionVersion of the following envvars changed in %s:\n\n" + Reset, envVarsPath)
	for _, c := range changes {
		fmt.Printf("  %-60s  %q  ->  %q\n", c.key, c.oldVer, c.newVer)
	}

	fmt.Printf("\nUpdate these introductionVersion changes in %s? [Y/n]: ", envVarsPath)
	var answer string
	fmt.Scanln(&answer)

	if strings.ToLower(strings.TrimSpace(answer)) == "n" {
		if err := os.WriteFile(envVarsPath, oldContent, Env.file_mode); err != nil {
			fmt.Printf(Red + "Failed to revert %s: %v\n\n" + Reset, envVarsPath, err)
		} else {
			fmt.Printf(Green + "Reverted %s to its previous state.\n\n" + Reset, envVarsPath)
		}
	} else {
		fmt.Printf(Green + "Updated the introductionVersion values in %s.\n\n" + Reset, envVarsPath)
	}
}
