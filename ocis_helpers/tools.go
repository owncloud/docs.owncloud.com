//go:build tools

// This file is never compiled, the 'tools' build tag is never set.
// It only exists to keep 'github.com/owncloud/ocis/v2' and its transitive
// dependencies in go.mod and go.sum when running 'go mod tidy'.
//
// The intermediate go code generated from templates/*.go.tmpl imports
// github.com/owncloud/ocis/v2/services/*/pkg/config/defaults, but it is written
// to the output directory which lies outside of this module. 'go mod tidy'
// therefore does not see those imports and drops the requirement, which makes
// every task using the intermediate code fail with:
//   module github.com/owncloud/ocis/v2 provides package ... and is replaced
//   but not required; to add it: go get github.com/owncloud/ocis/v2
//
// The blank imports below mirror the packages the intermediate code imports.
// If the ocis repo adds a service, add it here too, else 'go mod tidy' may
// drop dependencies that only the new service needs.

package main

import (
	_ "github.com/owncloud/ocis/v2/services/activitylog/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/antivirus/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/app-provider/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/app-registry/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/audit/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/auth-app/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/auth-basic/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/auth-bearer/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/auth-machine/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/auth-service/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/clientlog/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/collaboration/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/eventhistory/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/frontend/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/gateway/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/graph/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/groups/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/idm/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/idp/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/invitations/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/nats/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/notifications/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/ocdav/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/ocm/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/ocs/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/policies/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/postprocessing/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/proxy/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/search/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/settings/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/sharing/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/sse/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/storage-publiclink/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/storage-shares/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/storage-system/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/storage-users/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/thumbnails/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/userlog/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/users/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/web/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/webdav/pkg/config/defaults"
	_ "github.com/owncloud/ocis/v2/services/webfinger/pkg/config/defaults"
)
