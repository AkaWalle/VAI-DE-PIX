import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'



export function middleware(req: NextRequest) {

  // Só aplica em rotas /api/*

  if (!req.nextUrl.pathname.startsWith('/api/')) {

    return NextResponse.next()

  }



  const requestHeaders = new Headers(req.headers)

  const response = NextResponse.next({

    request: {

      headers: requestHeaders,

    },

  })



  // Headers CORS (libera preview + produção + localhost)

  response.headers.set('Access-Control-Allow-Credentials', 'true')

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With')



  const origin = req.headers.get('origin')

  if (origin && (origin.includes('vercel.app') || origin.includes('localhost'))) {

    response.headers.set('Access-Control-Allow-Origin', origin)

  } else {

    response.headers.set('Access-Control-Allow-Origin', 'https://vai-de-pix.vercel.app')

  }



  // OPTIONS → responde 204 sem corpo (nunca mais dá crash)

  if (req.method === 'OPTIONS') {

    return new Response(null, {

      status: 204,

      headers: response.headers,

    })

  }



  return response

}



export const config = {

  matcher: '/api/:path*',

}
