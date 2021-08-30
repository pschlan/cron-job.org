import { blue } from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/styles';
import React, { useEffect, useState } from 'react';

const useStyles = makeStyles(theme => ({
  key: {
    fontWeight: 'bold',
    color: blue[900]
  },
  statusRequestLine: {
    fontWeight: 'bold'
  }
}));

export default function Headers({ data }) {
  const classes = useStyles();
  const [ formattedData, setFormattedData ] = useState();

  useEffect(() => {
    const lines = data.replaceAll('\r', '').split('\n').slice(0, -1);

    setFormattedData(lines.map((line, lineNo) => {
      if (lineNo === 0 && line.toLowerCase().indexOf('http/') !== -1) {
        return <div className={classes.statusRequestLine}>{line}</div>;
      } else {
        const eqPos = line.indexOf(':');
        if (eqPos !== -1) {
          const key = line.substring(0, eqPos + 1);
          const value = line.substring(eqPos + 1);
          return <div><span className={classes.key}>{key}</span>{value}</div>;
        }
      }

      return <div>{line.length ? line : ' '}</div>;
    }));
  }, [data, classes]);

  return <>{formattedData}</>;
}
