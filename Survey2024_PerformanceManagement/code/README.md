# Analysis Code

This directory contains the source code with which the responses of the survey are analyzed.

## Replication

It is possible to partly repeat the analysis and generate the results again. In the case of a repetition, the analysis operates on anonymized responses so that it cannot calculate every result.

1. Requirement: NodeJS 20.14+ with `npm` installed.
1. Run `npm install`.
1. Run `npm run analyze`. This generates a new directory in `../data` with the name `results-<x>` where `x` is a number (a timestamp in milliseconds since 1970-01-01). This new directory contains the generated result files and reports. They should be similar to the existing files and reports in `../data/results-final`.

## License

This __source code__ is licensed under the MIT license.
