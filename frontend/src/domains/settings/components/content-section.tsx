type ContentSectionProps = {
  title: string
  desc: string
  children: React.ReactNode
}

export function ContentSection({ title, desc, children }: ContentSectionProps) {
  return (
    <div className='flex-1'>
      <div className='mb-4'>
        <h3 className='text-lg font-medium'>{title}</h3>
        <p className='text-muted-foreground text-sm'>{desc}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}
