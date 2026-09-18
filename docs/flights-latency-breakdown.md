# Flight regression latency

Measured client-side provider call durations include network, service work, response transfer and JSON parsing. They do not isolate server inference.

| Round | Operation | Requests | Individual request ms | Model total ms | Browser ms | Result |
|---:|---|---:|---|---:|---:|---|
| 1 | browser_navigate | 2 | 1004, 284 | 1288 | 3448 | ok |
| 2 | browser_click | 1 | 400 | 400 | 210 | ok |
| 3 | browser_click | 1 | 391 | 391 | 426 | ok |
| 4 | browser_click | 1 | 372 | 372 | 345 | ok |
| 5 | browser_fill | 2 | 312, 430 | 742 | 204 | ok |
| 6 | browser_fill | 3 | 389, 320, 319 | 1028 | 201 | ok |
| 7 | browser_click | 1 | 326 | 326 | 237 | ok |
| 8 | browser_fill | 2 | 559, 364 | 923 | 198 | ok |
| 9 | browser_click | 1 | 351 | 351 | 3 | stale |
| 10 | browser_observe | 1 | 383 | 383 | 177 | ok |
| 11 | browser_click | 1 | 350 | 350 | 213 | ok |
| 12 | browser_fill | 2 | 461, 375 | 836 | 387 | ok |
| 13 | browser_click | 1 | 423 | 423 | 225 | ok |
| 14 | browser_click | 1 | 431 | 431 | 4 | stale |
| 15 | browser_observe | 1 | 364 | 364 | 189 | ok |
| 16 | browser_click | 1 | 519 | 519 | 199 | ok |
| 17 | browser_observe | 1 | 399 | 399 | 165 | ok |
| 18 | browser_scroll | 2 | 434, 463 | 896 | 381 | ok |
| 19 | finish | 1 | 461 | 461 | 0 | ok |
