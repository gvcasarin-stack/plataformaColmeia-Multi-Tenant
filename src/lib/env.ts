if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Please set NEXTAUTH_SECRET environment variable')
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error('Please set NEXTAUTH_URL environment variable')
}

export const env = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
} 