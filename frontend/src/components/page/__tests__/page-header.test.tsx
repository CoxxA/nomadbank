import { render, screen } from '@testing-library/react'
import { PageHeader } from '../page-header'

it('renders title and description', () => {
  render(<PageHeader title='银行管理' description='管理账户' />)

  expect(screen.getByText('银行管理')).toBeInTheDocument()
  expect(screen.getByText('管理账户')).toBeInTheDocument()
})

it('renders actions when provided', () => {
  render(<PageHeader title='任务管理' actions={<button>新增</button>} />)

  expect(screen.getByRole('button', { name: '新增' })).toBeInTheDocument()
})
