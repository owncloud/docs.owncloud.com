package main

// this file generates adoc files for added, deprecated and removed envvars based on
// the 'env_vars.yaml' files that must exist in each referenced version of the 'delta_config.yaml'.
// it is CRUCIAL that versions compared are actual - do required updates first!
// updates are made automatically to the 'env_vars.yaml' file for the respective ocis version when running the 'services' task
//
// the versions to compare and the exclude patterns read from the 'delta_config.yaml' file of the ocis version being processed.
//
// when the files got created, you MUST do some post work manually like referencing the service names with xref:
// when executing, files get recreated, existing content will be overwritten!!

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"gopkg.in/yaml.v2"
)

// info: base_dir and services_folder are defined in 'main.go'
// info: persistent_files, delta_files and yamlServiceSource are defined in 'read_env_file.go'

// this is the config file that defines which versions are compared.
// it is located next to the 'env_vars.yaml' file of the version processed. the folder is persistent for this version
// !! this file MUST be adapted to the ocis version before running the process - its settings are unique to the ocis version !!
const yamlDeltaConfig = "delta_config.yaml"

// this is the file that maps envvar prefixes to service names, it is located next to the go files.
// in contrast to the config file above it is not version specific and shared by all ocis versions
const yamlServiceNames = "service_names.yaml"

// the date format used in the generated table header
const deltaDateFormat = "2006.01.02"

// the prefix of envvars that are global and therefore not bound to a single service
const globalEnvPrefix = "OCIS_"

// the xref used for envvars that could not be resolved to a service.
// the placeholders must be fixed manually in the generated file
const serviceXrefPlaceholder = "xref:{s-path}/xxx.adoc[yyy]"

// the xref used for global envvars
const serviceXrefGlobal = "xref:deployment/services/env-vars-special-scope.adoc[Special Scope Envvars]"

// DeltaConfig is the yaml source describing which versions are compared.
// see the comments in the 'delta_config.yaml' file for the meaning of the keys
type DeltaConfig struct {
	// VersionOld is the base version to compare from
	VersionOld string `yaml:"versionOld"`

	// VersionNew is the target version to compare to
	VersionNew string `yaml:"versionNew"`

	// FromVersion is the semver of VersionOld, used for printing
	FromVersion string `yaml:"fromVersion"`

	// ToVersion is the semver of VersionNew, used for printing and to identify added envvars
	ToVersion string `yaml:"toVersion"`

	// NameComponent is the prefix of the file names created
	NameComponent string `yaml:"nameComponent"`

	// DefaultExcludePattern lists the introduction versions already published
	DefaultExcludePattern []string `yaml:"defaultExcludePattern"`

	// ExtraExcludePattern lists additional introduction versions like from backporting
	ExtraExcludePattern []string `yaml:"extraExcludePattern"`
}

// EnvVar is one entry of the 'env_vars.yaml' file.
// note that the keys must match the ones written by 'templates/envar-db-table.go.tmpl'
type EnvVar struct {
	Name                string `yaml:"name"`
	DefaultValue        string `yaml:"defaultValue"`
	Type                string `yaml:"type"`
	Description         string `yaml:"description"`
	IntroductionVersion string `yaml:"introductionVersion"`
	DeprecationVersion  string `yaml:"deprecationVersion"`
	RemovalVersion      string `yaml:"removalVersion"`
	DeprecationInfo     string `yaml:"deprecationInfo"`
}

// EnvVarList holds envvars in the order of the 'env_vars.yaml' file.
// note that a plain Go map can not be used because maps do not keep the key order
// and the generated tables must follow the order of the source file
type EnvVarList struct {
	keys   []string
	values map[string]EnvVar
}

// AddedElsewhere is an envvar carrying an introduction version that was neither
// expected nor excluded. these are printed for further investigation only
type AddedElsewhere struct {
	name                string
	introductionVersion string
}

// ServiceName is one entry of the 'service_names.yaml' file.
// Path is the file name of the service page, Name is the link text of the xref created
type ServiceName struct {
	Path string `yaml:"path"`
	Name string `yaml:"name"`
}

// serviceNames maps envvar prefixes to service names, read from the 'service_names.yaml' file.
// it is loaded once when the task starts and used while rendering the tables
var serviceNames map[string]ServiceName

// serviceNotFound collects the envvars that could not be resolved to a service.
// they keep the placeholders in the generated tables and are printed for manual fixing
var serviceNotFound = []string{}

// descriptionCut collects the envvars whose description has been cut at an unescaped pipe.
// they are printed so the source can be checked, see cutAtUnescapedPipe below
var descriptionCut = []string{}

// RenderEnvVarDeltas creates the added, deprecated and removed envvar tables
// isDryrun is provided by the flag defined in 'main.go'
func RenderEnvVarDeltas(isDryrun bool) {

	ReadEnv()
	fmt.Printf(Green+"Generate the added, deprecated and removed envvar .adoc tables from the %s files\n\n"+Reset, yamlServiceSource)
	doEnvVarDeltas(isDryrun)
	RemoveOutputDir()
}

func doEnvVarDeltas(isDryrun bool) {

	cfg := getDeltaConfig()

	serviceNames = getServiceNames()

	excludePattern := mergeExcludeLists(cfg.DefaultExcludePattern, cfg.ExtraExcludePattern)

	if Env.isVerbose {
		fmt.Printf("Excluding the following introduction versions:\n  %s\n\n", strings.Join(excludePattern, ", "))
	}

	fileOld, fileNew := getSources(cfg.VersionOld, cfg.VersionNew)

	addedWith, addedElsewhere, addedGlobalBefore := getAdded(fileOld, fileNew, excludePattern, cfg.ToVersion)
	removedWith                                  := getRemoved(fileOld, fileNew)
	deprecatedWith                               := getDeprecated(fileNew)

	// global envvars that are flagged as added but are already published with the base version.
	// they are dropped from the added table, printing them is for information only
	if len(addedGlobalBefore) > 0 && Env.isVerbose {
		fmt.Printf("The following global envvars are flagged as added with %s but are already present in %s, " +
			"they are excluded from the added table:\n\n", cfg.ToVersion, cfg.VersionOld)

		for _, key := range addedGlobalBefore {
			fmt.Printf("%s\n", key)
		}
		fmt.Printf("\n")
	}

	// additional, unexpected introduction versions have been found.
	// although we just could exclude them automatically,
	// we print them to investigate and for possible further exclusion in the config file.
	if len(addedElsewhere) > 0 {
		fmt.Printf(Yellow+"\nThis additional out-of-scope envvars have been found in %s. " +
			"They may require fixing in ocis or extra excluded here:\n\n" + Reset, cfg.ToVersion)

		for _, item := range addedElsewhere {
			fmt.Printf("%s %s\n", item.name, item.introductionVersion)
		}
		fmt.Printf("\n")
	}

	dateToday := time.Now().Format(deltaDateFormat)

	// create the tables stored as string in a variable
	a := createTable("Added",      addedWith,      cfg.FromVersion, cfg.ToVersion, dateToday, false)
	r := createTable("Removed",    removedWith,    cfg.FromVersion, cfg.ToVersion, dateToday, false)
	d := createTable("Deprecated", deprecatedWith, cfg.FromVersion, cfg.ToVersion, dateToday, true)

	// envvars whose prefix is not listed in the service names file keep the placeholders.
	// print them so they can either be fixed in the generated file or added to the mapping
	if len(serviceNotFound) > 0 {
		fmt.Printf(Yellow+"\nThe following envvars could not be resolved to a service, they keep the " +
			"placeholders of %s. Consider adding their prefix to %s:\n\n" + Reset, serviceXrefPlaceholder, yamlServiceNames)

		for _, key := range serviceNotFound {
			fmt.Printf("%s\n", key)
		}
		fmt.Printf("\n")
	}

	// a description containing an unescaped pipe has been cut, print the envvars affected
	// so the source can be checked and the shortened text reviewed in the generated file
	if len(descriptionCut) > 0 {
		fmt.Printf(Yellow+"\nThe description of the following envvars contained an unescaped pipe, " +
			"it has been cut before its first appearance:\n\n" + Reset)

		for _, key := range descriptionCut {
			fmt.Printf("%s\n", key)
		}
		fmt.Printf("\n")
	}

	if isDryrun {
		fmt.Printf("Creation of tables succeeded not being written due to the dryrun flag set\n")
		return
	}

	// write the variables to a file
	writeOutput(cfg, a, "added")
	writeOutput(cfg, r, "removed")
	writeOutput(cfg, d, "deprecated")

	// print that we succeeded
	fmt.Printf("\nSuccess, see files created in: %s\n", deltaWriteDir(cfg))
	fmt.Printf("First: check and update the files manually to group entries for easier reading and to fix service names (xxx and yyy).\n")
	fmt.Printf("Second: you must run an Antora build. The files written are not tracked. Only a build makes them trackable.\n")
}

// getDeltaConfig reads the config file of the version being processed.
// note that 'services_dir' is assembled from the version given on the command line via main.go
// the 'yamlDeltaConfig' file is unique to the ocis version processed
func getDeltaConfig() DeltaConfig {

	var cfg DeltaConfig

	fullYamlPath := filepath.Join(services_dir, persistent_files, yamlDeltaConfig)

	yfile, err := os.ReadFile(fullYamlPath)
	if err != nil {
		fatalf("Failed reading the config file %s: %+v", fullYamlPath, err)
	}
	err = yaml.Unmarshal(yfile, &cfg)
	if err != nil {
		fatalf("Failed parsing the config file %s: %+v", fullYamlPath, err)
	}

	// the config is read from the version given on the command line,
	// therefore the version it writes to must be that very version
	// else we would silently write the tables into the folder of another version
	if cfg.VersionNew != ocis_version {
		fatalf("The 'versionNew' key (%s) in %s does not match the version given on the command line (%s)", cfg.VersionNew, fullYamlPath, ocis_version)
	}

	return cfg
}

// getServiceNames reads the envvar prefix to service name mapping.
// note that this file is not version specific and located next to the go files
func getServiceNames() map[string]ServiceName {

	names := map[string]ServiceName{}

	yfile, err := os.ReadFile(yamlServiceNames)
	if err != nil {
		fatalf("Failed reading the service names file %s: %+v", yamlServiceNames, err)
	}
	err = yaml.Unmarshal(yfile, &names)
	if err != nil {
		fatalf("Failed parsing the service names file %s: %+v", yamlServiceNames, err)
	}

	// an incomplete entry would create a broken xref, catch it here and not in the docs build
	for prefix, name := range names {
		if name.Path == "" || name.Name == "" {
			fatalf("The entry %s in %s must have both, a 'path' and a 'name' key", prefix, yamlServiceNames)
		}
	}

	if Env.isVerbose {
		fmt.Printf("Using %d envvar prefixes from %s\n\n", len(names), yamlServiceNames)
	}

	return names
}

// resolveService returns the adoc xref of the service an envvar belongs to.
// global envvars are not bound to a single service and get the special scope page,
// all others are resolved via the prefix mapping of the service names file.
// if no prefix matches, the placeholders are kept for manual fixing
func resolveService(key string) string {

	if strings.HasPrefix(key, globalEnvPrefix) {
		return serviceXrefGlobal
	}

	// the longest matching prefix wins, else a key such as 'STORAGE_USERS_...'
	// could be resolved by a shorter prefix such as 'STORAGE_'
	match := ""
	for prefix := range serviceNames {
		if strings.HasPrefix(key, prefix) && len(prefix) > len(match) {
			match = prefix
		}
	}

	if match == "" {
		// collect for printing, note that a key can be part of more than one table
		if !contains(serviceNotFound, key) {
			serviceNotFound = append(serviceNotFound, key)
		}
		return serviceXrefPlaceholder
	}

	return fmt.Sprintf("xref:{s-path}/%s.adoc[%s]", serviceNames[match].Path, serviceNames[match].Name)
}

// cutAtUnescapedPipe cuts a description before the first unescaped pipe.
// a table line is made of four (five for deprecated) cells separated by a pipe. an unescaped
// pipe in the description would therefore be read by adoc as the start of a new cell and
// shift all following cells, which breaks the table layout.
// note that global ('OCIS_') envvars can be described differently by each service using them.
// those descriptions are collected with ' | ' as separator when the source file is written,
// see 'addValue' in 'templates/envar-db-table.go.tmpl'. keeping the first one is sufficient
// here, the full list stays available in the service tables.
// an escaped pipe is printed literally by adoc and can stay
func cutAtUnescapedPipe(key string, description string) string {

	for index := 0; index < len(description); index++ {
		if description[index] != '|' {
			continue
		}
		if index > 0 && description[index-1] == '\\' {
			continue
		}
		// collect for printing, note that a key can be part of more than one table
		if !contains(descriptionCut, key) {
			descriptionCut = append(descriptionCut, key)
		}
		return strings.TrimSpace(description[:index])
	}

	return description
}

// contains reports if a string is already part of a list
func contains(list []string, item string) bool {

	for _, element := range list {
		if element == item {
			return true
		}
	}
	return false
}

// mergeExcludeLists merges the two exclude lists and removes duplicates if any
func mergeExcludeLists(defaultExcludePattern []string, extraExcludePattern []string) []string {

	seen := make(map[string]bool)
	merged := []string{}

	for _, pattern := range append(append([]string{}, defaultExcludePattern...), extraExcludePattern...) {
		if !seen[pattern] {
			seen[pattern] = true
			merged = append(merged, pattern)
		}
	}
	sort.Strings(merged)
	return merged
}

// getSources reads the 'env_vars.yaml' file of both versions compared
func getSources(versionOld string, versionNew string) (*EnvVarList, *EnvVarList) {

	dirOld := envVarsPath(versionOld)
	dirNew := envVarsPath(versionNew)

	fmt.Printf("Reading the following files for comparison:\n\n")
	fmt.Printf("  %s\n",   dirOld)
	fmt.Printf("  %s\n\n", dirNew)

	fileOld, err := loadEnvVars(dirOld)
	if err != nil {
		fatalf("Failed reading %s: %+v", dirOld, err)
	}

	fileNew, err := loadEnvVars(dirNew)
	if err != nil {
		fatalf("Failed reading %s: %+v", dirNew, err)
	}

	return fileOld, fileNew
}

// envVarsPath assembles the path to the 'env_vars.yaml' file of a given version.
// note that this is part of a version folder such as '8.2' and not a semver
func envVarsPath(version string) string {

	return filepath.Join(base_dir, version, services_folder, persistent_files, yamlServiceSource)
}

// deltaWriteDir assembles the folder the generated tables are written to
func deltaWriteDir(cfg DeltaConfig) string {

	return filepath.Join(base_dir, cfg.VersionNew, services_folder, delta_files)
}

// loadEnvVars reads an 'env_vars.yaml' file and keeps the order of its keys.
// the file is parsed twice, once for the key order and once for the values
func loadEnvVars(path string) (*EnvVarList, error) {

	yfile, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// yaml.MapSlice keeps the order of the keys as they appear in the file
	var ordered yaml.MapSlice
	err = yaml.Unmarshal(yfile, &ordered)
	if err != nil {
		return nil, err
	}

	list := newEnvVarList(len(ordered))
	err = yaml.Unmarshal(yfile, &list.values)
	if err != nil {
		return nil, err
	}

	for _, item := range ordered {
		key, ok := item.Key.(string)
		if !ok {
			return nil, fmt.Errorf("unexpected non string key: %v", item.Key)
		}
		list.keys = append(list.keys, key)
	}

	return list, nil
}

func newEnvVarList(capacity int) *EnvVarList {

	return &EnvVarList{
		keys:   make([]string, 0, capacity),
		values: make(map[string]EnvVar, capacity),
	}
}

func (l *EnvVarList) add(key string, value EnvVar) {

	l.keys        = append(l.keys, key)
	l.values[key] = value
}

// getAdded collects the envvars introduced with the target version.
// envvars carrying an unexpected introduction version are returned separately,
// so are global envvars that are already present in the base version
func getAdded(fileOld *EnvVarList, fileNew *EnvVarList, excludePattern []string, toVersion string) (*EnvVarList, []AddedElsewhere, []string) {

	addedWith         := newEnvVarList(0)
	addedElsewhere    := []AddedElsewhere{}
	addedGlobalBefore := []string{}

	for _, key := range fileNew.keys {
		value := fileNew.values[key]
		if isExcluded(value.IntroductionVersion, excludePattern) {
			continue
		}
		// a global envvar starting with OCIS_ is shared by multiple services and carries the
		// introduction version of the service that adopted it last. it can therefore be flagged
		// as added though it is already published with the base version, which makes it a no-add
		if strings.HasPrefix(key, globalEnvPrefix) {
			if _, ok := fileOld.values[key]; ok {
				addedGlobalBefore = append(addedGlobalBefore, key)
				continue
			}
		}
		// the requirement says that we only want to catch the target version
		if value.IntroductionVersion == toVersion {
			addedWith.add(key, value)
		} else {
			// but if we find another version, we should add it to another list which later can be printed
			addedElsewhere = append(addedElsewhere, AddedElsewhere{name: key, introductionVersion: value.IntroductionVersion})
		}
	}

	return addedWith, addedElsewhere, addedGlobalBefore
}

// isExcluded reports if an introduction version is covered by the exclude patterns.
// note that this is a substring and not an exact match, a loose introduction version
// like '8.1' is therefore excluded by the pattern '8.1.0' as it was in the Python original
func isExcluded(introductionVersion string, excludePattern []string) bool {

	for _, pattern := range excludePattern {
		if strings.Contains(pattern, introductionVersion) {
			return true
		}
	}
	return false
}

// getRemoved collects the envvars that are no longer present in the target version
func getRemoved(fileOld *EnvVarList, fileNew *EnvVarList) *EnvVarList {

	removedWith := newEnvVarList(0)

	for _, key := range fileOld.keys {
		if _, ok := fileNew.values[key]; !ok {
			removedWith.add(key, fileOld.values[key])
		}
	}

	return removedWith
}

// getDeprecated collects the envvars of the target version that have a removal version set
func getDeprecated(fileNew *EnvVarList) *EnvVarList {

	deprecatedWith := newEnvVarList(0)

	for _, key := range fileNew.keys {
		value := fileNew.values[key]
		if value.RemovalVersion != "" {
			deprecatedWith.add(key, value)
		}
	}

	return deprecatedWith
}

// createTable renders one complete adoc table.
// isDeprecated selects the column layout as deprecated envvars have two extra columns
func createTable(typeText string, source *EnvVarList, fromVersion string, toVersion string, dateToday string, isDeprecated bool) string {

	// get the table header
	columns := "~,~,~,~"
	closing := "Default"
	if isDeprecated {
		columns = "~,~,~,~,~"
		closing = "Removal Version | Deprecation Info"
	}

	var b strings.Builder
	b.WriteString(createAdocStart(typeText, fromVersion, toVersion, dateToday, columns, closing))

	// the xref written for the line before, used to group consecutive lines of the same service
	previous := ""

	// note that all global envvars come first, all others follow.
	// the xref of an envvar that can not be resolved to a service keeps the placeholders
	// and must be corrected in the output file manually
	for _, isGlobal := range []bool{true, false} {
		for _, key := range source.keys {
			if strings.HasPrefix(key, globalEnvPrefix) != isGlobal {
				continue
			}
			value   := source.values[key]
			service := resolveService(key)

			// a pipe in the description would create an extra cell and break the table
			description := cutAtUnescapedPipe(key, value.Description)

			// only the first line of a group carries the xref, the following lines get an empty
			// service cell which keeps the leading pipe. this is what was done manually before.
			// note that unresolved envvars are never grouped, their placeholders are identical
			// but they may belong to different services and each needs a manual fix
			if service == previous && service != serviceXrefPlaceholder {
				service = ""
			} else {
				previous = service
			}

			if isDeprecated {
				b.WriteString(addAdocLine2(service, key, description, value.RemovalVersion, value.DeprecationInfo))
			} else {
				b.WriteString(addAdocLine1(service, key, description, value.DefaultValue))
			}
		}
	}

	// finally close the table
	b.WriteString(createAdocEnd())
	return b.String()
}

// createAdocStart creates the page/table header.
// 'closing' contains variable column names dependent if added/removed or deprecated
func createAdocStart(typeText string, fromVersion string, toVersion string, creationDate string, columns string, closing string) string {

	return fmt.Sprintf(`// # %s Variables between oCIS %s and oCIS %s
// commenting the headline to make it better includable

// table created per %s
// the table should be recreated/updated on source () changes

[width="100%%",cols="%s",options="header"]
|===
| Service | Variable | Description | %s

`, typeText, fromVersion, toVersion, creationDate, columns, closing)
}

// createAdocEnd closes the table
func createAdocEnd() string {

	return `|===

`
}

// addAdocLine1 adds a table line for added/removed
func addAdocLine1(service string, variable string, description string, value string) string {

	return fmt.Sprintf(`| %s
| %s
| %s
| %s

`, service, variable, description, value)
}

// addAdocLine2 adds a table line for deprecated, this has different columns
func addAdocLine2(service string, variable string, description string, removalVersion string, deprecationInfo string) string {

	return fmt.Sprintf(`| %s
| %s
| %s
| %s
| %s

`, service, variable, description, removalVersion, deprecationInfo)
}

// writeOutput writes the content of one table to a file
func writeOutput(cfg DeltaConfig, content string, typeText string) {

	var err error

	targetFolder := deltaWriteDir(cfg)

	// create target folder if not exists
	err = os.MkdirAll(targetFolder, Env.folder_mode)
	if err != nil {
		fatalf("Failed creating the %s folder: %+v", targetFolder, err)
	}

	fullAdocPath := filepath.Join(targetFolder, cfg.NameComponent+"-"+typeText+".adoc")

	err = os.WriteFile(fullAdocPath, []byte(content), Env.file_mode)
	if err != nil {
		fatalf("Failed creating %s file: %+v", typeText, err)
	}
}
