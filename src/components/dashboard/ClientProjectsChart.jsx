import React from 'react';
import { SectionCard, SingleSeriesBarChart } from './ChartCard';

const ClientProjectsChart = ({ data }) => (
  <SectionCard title="Proyectos por cliente" description="Del mes elegido (en curso y entregados)">
    <SingleSeriesBarChart
      data={data}
      xKey="client"
      yKey="total"
      emptyMessage="Sin proyectos este mes"
      formatValue={(value) => `${value} ${value === 1 ? 'proyecto' : 'proyectos'}`}
    />
  </SectionCard>
);

export default ClientProjectsChart;
