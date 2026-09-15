# maintainer guide

`.agents/` describes what the code does and why. It is a map, not a standard:
where the two disagree, the packages' `src/` and test suites win, and the docs get fixed.

## Rules that apply everywhere

- **MUST**, **MUST NOT**, **SHOULD** and **MAY** use RFC 2119 meanings. They mark
  real invariants - layer boundaries, wire contracts, output shapes - not house style.

## Find the contract

| Task | Read |
| --- | --- |
| xxx | [01 xxx](./.agents/01-xxx.md) |
