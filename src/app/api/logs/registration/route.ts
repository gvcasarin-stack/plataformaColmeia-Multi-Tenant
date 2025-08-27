import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const logEntry = await request.json()
    
    // Log no console da Vercel (aparece nos logs da função)
    console.log('🚀 [REGISTRATION-LOG]', {
      timestamp: logEntry.timestamp,
      step: logEntry.step,
      message: logEntry.message,
      data: logEntry.data,
      error: logEntry.error,
      type: logEntry.type || 'info'
    })
    
    // Se for erro, usar console.error
    if (logEntry.type === 'error') {
      console.error('❌ [REGISTRATION-ERROR]', {
        step: logEntry.step,
        message: logEntry.message,
        error: logEntry.error
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao processar log de registro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
