import React from 'react';
import { SectionCard, SingleSeriesBarChart } from './ChartCard';

const WeeklyRecordingsChart = ({ data }) => (
  <SectionCard title="Grabaciones por semana" description="Las 8 semanas hasta el fin del mes, incluidas las que no tuvieron rodajes">
    <SingleSeriesBarChart
      data={data}
      xKey="week"
      yKey="total"
      emptyMessage="Aún no hay grabaciones registradas"
      formatValue={(value) => `${value} ${value === 1 ? 'grabación' : 'grabaciones'}`}
    />
  </SectionCard>
);

export default WeeklyRecordingsChart;
