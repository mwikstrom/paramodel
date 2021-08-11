# Paramodel

Run-time domain model for event-sourcing.

* [NPM Package](https://www.npmjs.com/package/paramodel)
* [API Reference](https://github.com/mwikstrom/paramodel/blob/master/docs/paramodel.md)
* Requires [paratype](https://github.com/mwikstrom/paratype#readme) as a peer dependency

----

- TODO: Equality query operators for PiiString

- TODO: Expose PiiString in materialized views. Take dependency on exposed PII scopes,
  and cascade those scopes to derived materialized views. Purge after shredding
  shall rewrite the exposure.

- TODO: Continuation tokens must include version and timestamp and shall expire when too old
  (older than purge ttl) - or be renewed in case version is still not purged!
