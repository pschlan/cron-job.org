import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, ResponsiveContainer, Legend, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartColors, TimingFields } from '../../utils/Constants';
import { formatMs } from '../../utils/Units';

export default function Timing({ stats, header })  {
  const [ timingData, setTimingData ] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (Math.max(...Object.values(stats || {})) === 0) {
      setTimingData(null);
      return;
    }

    setTimingData(stats ? [
      TimingFields.reduce((prev, cur) => ({
        fields: {
          ...prev.fields,
          [cur]: Math.round(Math.max(0, ((stats || {})[cur] - prev.lastValue)) / 10) / 100
        },
        lastValue: Math.max(prev.lastValue, (stats || {})[cur])
      }), { fields: {}, lastValue: 0 }).fields,
    ] : null);
  }, [stats]);

  function formatLegend(value) {
    return t(`jobs.timingItem.${value}`);
  }

  function formatTooltip(value, name, props) {
    return [
      formatMs(value, t),
      t(`jobs.timingItem.${name}`)
    ];
  }

  return timingData && <>
      {header}
      <div>
        <ResponsiveContainer width='100%' height={100}>
        <BarChart data={timingData} layout='vertical'>
          <XAxis
            type='number'
            domain={[0, timingData[0].total]}
            tickCount={10}
            tickFormatter={x => formatMs(x, t)} />
          <YAxis
            dataKey='name'
            type='category'
            hide={true}
            />

          <Legend formatter={formatLegend} />
          <Tooltip formatter={formatTooltip} />

          {TimingFields.map((item, index) =>
            <Bar dataKey={item} key={item} stackId='timing' fill={ChartColors[index]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </>;
}
