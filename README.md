# Paramodel

Run-time domain model for event-sourcing.

* [NPM Package](https://www.npmjs.com/package/paramodel)
* [API Reference](https://github.com/mwikstrom/paramodel/blob/master/docs/paramodel.md)
* Requires [paratype](https://github.com/mwikstrom/paratype#readme) as a peer dependency

----

- TODO: Add store.views() for iterating over all views

- TODO: Add provider.stores() for iterating over all stores (this requires store to be registered somehow)

- TODO: Add store.drop() for dropping views that are no longer modelled.

- TODO: Support fast sweeping sync (not storing every commit, like a purge on the fly sort of)

- TODO: Add auto-mapping projection (disclosing all PII)

- TODO: Continuation tokens must include version and timestamp and shall expire when too old
  (older than purge ttl) - or be renewed in case version is still not purged!
