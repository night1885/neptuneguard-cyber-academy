# Timed-out owner-read shutdown regression

Test-only coverage uses the actual runtime, router and default ten-second owner-read response deadline with synthetic Discord transport and a pool double whose end waits for its pending read. It exercises late success and late failure, repeated detach, stopped interaction admission, pool-close waiting, and late-response suppression. The two deadline cases take about twenty seconds in total and are discovered by the existing unit-test wildcard. Exact-head CI is pending.

The runtime tracks the interaction response task; after its deadline that task can finish while the underlying query remains pending. The test deliberately checks that detach delegates completion to pool.end and awaits it. It does not establish an independent runtime query-drain mechanism.

This is not a real PostgreSQL pool-drain result, real network partition, process-signal test, live Discord test, or proof of provider-specific shutdown deadlines. Those checks remain open. No runtime code, production configuration, migration, deployment or activation is changed.
