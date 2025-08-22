# example_agent v1.0 — goal: classify support tickets

## Inputs
- ticket_title, ticket_body

## Outputs
- category (billing|technical|account), confidence (0-1)

## Guardrails
- Do not hallucinate categories; choose from the list.
- Respond in strict JSON.

## Evaluation Notes
- Validate on 20 labeled examples; target ≥0.8 F1.

## Changelog
- v1.0: Initial prompt.

