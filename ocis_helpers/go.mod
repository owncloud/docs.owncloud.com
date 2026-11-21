module main/ocis_helpers

// module github.com/owncloud/ocis/v2

go 1.26.10

replace github.com/owncloud/ocis/v2 => ../../ocis

replace github.com/studio-b12/gowebdav => github.com/kobergj/gowebdav v0.0.0-20251030165916-532350997dde

replace github.com/egirna/icap-client => github.com/kobergj/icap-client v0.0.0-20250116172800-8eaa5022532b

replace github.com/unrolled/secure => github.com/DeepDiver1975/secure v0.0.0-20240611112133-abc838fb797c

replace github.com/go-micro/plugins/v4/store/nats-js-kv => github.com/kobergj/plugins/v4/store/nats-js-kv v0.0.0-20261030085317-811a2ded849b

replace github.com/go-micro/plugins/v4/events/natsjs => github.com/kobergj/plugins/v4/events/natsjs v1.2.1-0.20261030085317-811a2ded849b

replace go-micro.dev/v4 => github.com/kobergj/go-micro/v4 v4.0.0-20250610135441-d0b187215699

require (
	github.com/owncloud/ocis/v2 v2.0.1-0.20250122072425-665072d86d1a
	gopkg.in/yaml.v2 v2.4.0
)

require (
	dario.cat/mergo v1.0.2 // indirect
	github.com/Azure/go-ntlmssp v0.1.1 // indirect
	github.com/KimMachineGun/automemlimit v0.7.5 // indirect
	github.com/Masterminds/semver v1.5.0 // indirect
	github.com/MicahParks/keyfunc/v2 v2.1.0 // indirect
	github.com/Microsoft/go-winio v0.6.2 // indirect
	github.com/ProtonMail/go-crypto v1.1.6 // indirect
	github.com/ajg/form v1.5.1 // indirect
	github.com/armon/go-radix v1.0.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/bitly/go-simplejson v0.5.0 // indirect
	github.com/bmizerany/assert v0.0.0-20160611221934-b7ed37b82869 // indirect
	github.com/cenkalti/backoff v2.2.1+incompatible // indirect
	github.com/cenkalti/backoff/v5 v5.0.3 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/cloudflare/circl v1.6.3 // indirect
	github.com/coreos/go-oidc/v3 v3.21.0 // indirect
	github.com/coreos/go-semver v0.3.1 // indirect
	github.com/coreos/go-systemd/v22 v22.7.0 // indirect
	github.com/cornelk/hashmap v1.0.8 // indirect
	github.com/cpuguy83/go-md2man/v2 v2.0.7 // indirect
	github.com/cs3org/go-cs3apis v0.0.0-20241105092511-3ad35d174fc1 // indirect
	github.com/cyphar/filepath-securejoin v0.6.1 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/emirpasic/gods v1.18.1 // indirect
	github.com/evanphx/json-patch/v5 v5.5.0 // indirect
	github.com/fatih/color v1.19.0 // indirect
	github.com/felixge/httpsnoop v1.1.0 // indirect
	github.com/fsnotify/fsnotify v1.10.1 // indirect
	github.com/go-acme/lego/v4 v4.34.0 // indirect
	github.com/go-asn1-ber/asn1-ber v1.5.8 // indirect
	github.com/go-chi/chi/v5 v5.4.0 // indirect
	github.com/go-chi/httprate v0.16.0 // indirect
	github.com/go-chi/render v1.0.3 // indirect
	github.com/go-git/gcfg v1.5.1-0.20230307220236-3a3c6141e376 // indirect
	github.com/go-git/go-billy/v5 v5.9.0 // indirect
	github.com/go-git/go-git/v5 v5.19.2 // indirect
	github.com/go-jose/go-jose/v4 v4.1.6 // indirect
	github.com/go-ldap/ldap/v3 v3.4.14 // indirect
	github.com/go-logr/logr v1.4.4 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-micro/plugins/v4/events/natsjs v1.2.2 // indirect
	github.com/go-micro/plugins/v4/logger/zerolog v1.2.0 // indirect
	github.com/go-micro/plugins/v4/store/nats-js v1.2.1 // indirect
	github.com/go-micro/plugins/v4/store/nats-js-kv v0.0.0-20240726082623-6831adfdcdc4 // indirect
	github.com/go-micro/plugins/v4/store/redis v1.2.1 // indirect
	github.com/go-redis/redis/v8 v8.11.5 // indirect
	github.com/gobwas/httphead v0.1.0 // indirect
	github.com/gobwas/pool v0.2.1 // indirect
	github.com/gobwas/ws v1.2.1 // indirect
	github.com/golang-jwt/jwt/v5 v5.3.1 // indirect
	github.com/golang/groupcache v0.0.0-20241129210726-2c02b8208cf8 // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/gorilla/handlers v1.5.1 // indirect
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.31.0 // indirect
	github.com/hashicorp/go-hclog v1.6.3 // indirect
	github.com/hashicorp/go-plugin v1.8.0 // indirect
	github.com/hashicorp/yamux v0.1.2 // indirect
	github.com/imdario/mergo v0.3.15 // indirect
	github.com/jbenet/go-context v0.0.0-20150711004518-d14ea06fba99 // indirect
	github.com/kevinburke/ssh_config v1.2.0 // indirect
	github.com/klauspost/compress v1.20.2 // indirect
	github.com/klauspost/cpuid/v2 v2.4.0 // indirect
	github.com/leonelquinteros/gotext v1.7.2 // indirect
	github.com/mattn/go-colorable v0.1.15 // indirect
	github.com/mattn/go-isatty v0.0.22 // indirect
	github.com/miekg/dns v1.1.72 // indirect
	github.com/mileusna/useragent v1.3.5 // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/nats-io/jwt/v2 v2.8.2 // indirect
	github.com/nats-io/nats.go v1.54.0 // indirect
	github.com/nats-io/nkeys v0.4.16 // indirect
	github.com/nats-io/nuid v1.0.1 // indirect
	github.com/nxadm/tail v1.4.8 // indirect
	github.com/oklog/run v1.2.0 // indirect
	github.com/owncloud/libre-graph-api-go v1.0.5-0.20260216101009-eeac018af245 // indirect
	github.com/owncloud/reva/v2 v2.0.0-20261111080110-3e71db9f7bf2 // indirect
	github.com/oxtoacart/bpool v0.0.0-20190530202638-03653db5a59c // indirect
	github.com/patrickmn/go-cache v2.1.0+incompatible // indirect
	github.com/pbnjay/memory v0.0.0-20210728143218-7b4eea64cf58 // indirect
	github.com/pjbgf/sha1cd v0.6.0 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/prometheus/client_golang v1.24.1 // indirect
	github.com/prometheus/client_model v0.6.3 // indirect
	github.com/prometheus/common v0.70.1 // indirect
	github.com/prometheus/procfs v0.21.1 // indirect
	github.com/rs/cors v1.11.1 // indirect
	github.com/rs/zerolog v1.35.1 // indirect
	github.com/russross/blackfriday/v2 v2.1.0 // indirect
	github.com/sercand/kuberesolver/v5 v5.1.1 // indirect
	github.com/sergi/go-diff v1.4.0 // indirect
	github.com/sirupsen/logrus v1.10.2 // indirect
	github.com/skeema/knownhosts v1.3.1 // indirect
	github.com/urfave/cli/v2 v2.27.7 // indirect
	github.com/xanzy/ssh-agent v0.3.3 // indirect
	github.com/xrash/smetrics v0.0.0-20240521201337-686a1a2994c1 // indirect
	github.com/zeebo/xxh3 v1.1.0 // indirect
	go-micro.dev/v4 v4.11.0 // indirect
	go.etcd.io/etcd/api/v3 v3.7.2 // indirect
	go.etcd.io/etcd/client/pkg/v3 v3.7.2 // indirect
	go.etcd.io/etcd/client/v3 v3.7.2 // indirect
	go.opentelemetry.io/auto/sdk v1.2.1 // indirect
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.72.0 // indirect
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.71.0 // indirect
	go.opentelemetry.io/otel v1.47.0 // indirect
	go.opentelemetry.io/otel/exporters/jaeger v1.17.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.47.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.47.0 // indirect
	go.opentelemetry.io/otel/log v1.47.0 // indirect
	go.opentelemetry.io/otel/metric v1.47.0 // indirect
	go.opentelemetry.io/otel/sdk v1.47.0 // indirect
	go.opentelemetry.io/otel/trace v1.47.0 // indirect
	go.opentelemetry.io/proto/otlp v1.11.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	go.uber.org/zap v1.27.1 // indirect
	golang.org/x/crypto v0.58.0 // indirect
	golang.org/x/mod v0.41.0 // indirect
	golang.org/x/net v0.62.0 // indirect
	golang.org/x/oauth2 v0.37.0 // indirect
	golang.org/x/sync v0.24.0 // indirect
	golang.org/x/sys v0.49.0 // indirect
	golang.org/x/text v0.43.0 // indirect
	golang.org/x/tools v0.51.0 // indirect
	google.golang.org/genproto/googleapis/api v0.0.0-20260928230214-8a89bd6388cc // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260928230214-8a89bd6388cc // indirect
	google.golang.org/grpc v1.86.0-dev // indirect
	google.golang.org/protobuf v1.36.12 // indirect
	gopkg.in/tomb.v1 v1.0.0-20141024135613-dd632973f1e7 // indirect
	gopkg.in/warnings.v0 v0.1.2 // indirect
)
