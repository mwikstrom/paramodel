# Paramodel

Run-time domain model for event-sourcing.

* [NPM Package](https://www.npmjs.com/package/paramodel)
* [API Reference](https://github.com/mwikstrom/paramodel/blob/master/docs/paramodel.md)
* Requires [paratype](https://github.com/mwikstrom/paratype#readme) as a peer dependency

----

- TODO: Split store impl into functions

- TODO: Use LRU cache for PII keys. Delete from cache when committing a shredded scope.

- TODO: Validate model: 
  Dependencies must exist AND not cause loop.
  Dependency of a materialized view cannot be disclosing.
  Events for mutators must exist. 
  Mapping keys must be equal.

- TODO: Memory driver continuation tokens must be improved (can't just skip over stuff)

- TODO: Add store.views() for iterating over all views

- TODO: Add provider.stores() for iterating over all stores (this requires store to be registered somehow)

- TODO: Add store.drop() for dropping views that are no longer modelled.

- TODO: Support fast sweeping sync (not storing every commit, like a purge on the fly sort of)

- TODO: Add auto-mapping projection (disclosing all PII)

- TODO: External continuation tokens (when there's a server) must include version and timestamp and shall expire when too old
  (older than purge ttl) - or be renewed in case version is still not purged!
