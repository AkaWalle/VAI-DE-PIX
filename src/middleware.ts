import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'



export function middleware(request: NextRequest) {

  // Captura a origin do request

  const origin = request.headers.get('origin') ?? ''



  // Cria a resposta

  const response = request.method === 'OPTIONS' 

    ? new NextResponse(null, { status: 200 })

    : NextResponse.next()



  // Libera TODAS as origens do Vercel (preview + produção + localhost)

  if (

    origin.includes('vercel.app') || 

    origin.includes('localhost') || 

    origin === 'https://vai-de-pix.vercel.app'

  ) {

    response.headers.set('Access-Control-Allow-Origin', origin)

  } else {

    response.headers.set('Access-Control-Allow-Origin', 'https://vai-de-pix.vercel.app')

  }



  response.headers.set('Access-Control-Allow-Credentials', 'true')

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token')



  // ESSA LINHA É A CHAVE: responde 200 direto no OPTIONS sem passar pro handler

  if (request.method === 'OPTIONS') {

    return response

  }



  return response

}



export const config = {

  matcher: '/api/:path*',

}

