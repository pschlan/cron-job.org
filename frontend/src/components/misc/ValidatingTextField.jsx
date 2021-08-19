import React, { useCallback, useEffect, useState } from 'react';
import { TextField } from '@material-ui/core';

export default function ValidatingTextField({ validator, pattern, patternErrorText, ...props }) {
  const [ value, setValue ] = useState(props.defaultValue || props.value || '');
  const [ valid, setValid ] = useState(false);
  const [ typed, setTyped ] = useState(false);
  const validatorHook = useCallback(value => {
      if (pattern) {
        return value.match(pattern);
      }
      if (validator) {
        return validator(value);
      }
      return true;
    }, [validator, pattern]);

  useEffect(() => {
    setValid(validatorHook(value));
  }, [value, validatorHook]);

  return <TextField
    {...props}
    onChange={event => {
      setTyped(true);
      setValue(event.target.value);
      props.onChange && props.onChange(event);
    }}
    error={!valid && typed}
    helperText={!valid && typed && patternErrorText}
    />;
}
