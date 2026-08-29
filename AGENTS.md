# Delivery

- After creating any commit, immediately push the current branch to `origin`.
- After pushing, monitor the resulting CI run and fix it until it is green. Do not declare committed work complete while local `HEAD` is absent from `origin` or its CI is pending, canceled, or failing.
