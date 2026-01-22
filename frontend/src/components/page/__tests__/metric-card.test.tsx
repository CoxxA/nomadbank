import { render, screen } from '@testing-library/react'
import { MetricCard } from '../metric-card'

it('renders label and value', () => {
  render(<MetricCard label='待处理任务' value='12' />)

  expect(screen.getByText('待处理任务')).toBeInTheDocument()
  expect(screen.getByText('12')).toBeInTheDocument()
})
