# Paramodel

Run-time domain model for event-sourcing.

* [NPM Package](https://www.npmjs.com/package/paramodel)
* [API Reference](https://github.com/mwikstrom/paramodel/blob/master/docs/paramodel.md)
* Requires [paratype](https://github.com/mwikstrom/paratype#readme) as a peer dependency

----

- TODO: Drop shredded scopes during purge

- TODO: Equality query operators for PiiString

- TODO: Expose PiiString in materialized views. Take dependency on exposed PII scopes,
  and cascade those scopes to derived materialized views. Purge after shredding
  shall rewrite the exposure.

  View state record shall contain: "undisclosed state" and "exposed scopes"

  Purging of PII:

  First delete the key (if it's version is less than or equal to the shredded version)
  
  Then, query all materialized view states that exposes the shredded scope:

  For each such state, rewrite it - possibly ending up without "undisclosed state" because
  no more exposed scopes remain.

  Finally, update the pii sync record to the newly synced version.

- TODO: Continuation tokens must include version and timestamp and shall expire when too old
  (older than purge ttl) - or be renewed in case version is still not purged!

- TODO: (Maybe) move view headers into a separate partition so that all views can be
  discovered (not only those that currently are modelled)

  This change is important for purging PII, because we may otherwise end up with lingering
  disclosed PIIs after the key was shredded.
