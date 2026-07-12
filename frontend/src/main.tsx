import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { ApiError } from '@/api/client'
import { router } from '@/app/router'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Missing root element')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div className='grid min-h-screen place-items-center bg-[#f4f2ec]'>
            <div className='text-center'>
              <div className='mx-auto h-9 w-9 animate-pulse rounded-xl bg-[#216a55]' />
              <p className='mt-4 text-sm font-medium text-[#68736e]'>正在打开私人账本…</p>
            </div>
          </div>
        }
      >
        <RouterProvider router={router} context={{ queryClient }} />
      </Suspense>
      <Toaster
        position='top-right'
        closeButton
        toastOptions={{
          style: {
            background: '#fffefa',
            color: '#25312c',
            border: '1px solid #d9dfda',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgb(24 35 31 / 14%)',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
)
