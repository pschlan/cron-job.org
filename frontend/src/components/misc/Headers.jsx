import { blue } from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/styles';
import React, { useEffect, useState } from 'react';

const useStyles = makeStyles(theme => ({
  key: {
    fontWeight: 'bold',
    color: theme.palette.type === 'dark' ? blue[400] : blue[900]
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
        return <div className={classes.statusRequestLine} key={lineNo}>{line}</div>;
      } else {
        const eqPos = line.indexOf(':');
        if (eqPos !== -1) {
          const key = line.substring(0, eqPos + 1);
          const value = line.substring(eqPos + 1);
          return <div key={lineNo}><span className={classes.key}>{key}</span>{value}</div>;
        }
      }

      return <div key={lineNo}>{line.length ? line : ' '}</div>;
    }));
  }, [data, classes]);

  return <>{formattedData}</>;
}
