'use client'

const getErrorMessage = (error: string | undefined) => {
  switch (error) {
    case 'Configuration':
      return 'There is a problem with the server configuration.'
    case 'AccessDenied':
      return 'You do not have permission to sign in.'
    case 'Verification':
      return 'The verification token has expired or has already been used.'
    case 'AuthorizedCallbackError':
      return 'There was a problem signing you in.'
    default:
      return 'Invalid email or password.'
  }
}

export function AuthError({ error }: { error?: string }) {
  if (!error) return null
  
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">
            {getErrorMessage(error)}
          </p>
        </div>
      </div>
    </div>
  )
}
