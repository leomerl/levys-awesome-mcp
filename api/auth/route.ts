import { NextRequest, NextResponse } from 'next/server';
import { validateUser, createSession } from '../../lib/auth';

// Interface for the request body
interface LoginRequest {
  email: string;
  password: string;
}

// Success response interface
interface SuccessResponse {
  success: true;
  token: string;
  user: {
    id: string;
    email: string;
  };
}

// Error response interface
interface ErrorResponse {
  success: false;
  message: string;
}

/**
 * POST handler for user authentication
 * @param request - Next.js request object
 * @returns JSON response with authentication result
 */
export async function POST(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    // Parse the request body
    const body: LoginRequest = await request.json();
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email format'
        },
        { status: 400 }
      );
    }

    // Validate user credentials
    const authResult = await validateUser(body.email, body.password);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid credentials'
        },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSession(authResult.user);

    // Return success response
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: authResult.user.id,
        email: authResult.user.email
      }
    });

  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - not supported for this endpoint
 */
export async function GET(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed. Use POST for authentication.'
    },
    { status: 405 }
  );
}

/**
 * Handle other HTTP methods
 */
export async function PUT(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed'
    },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed'
    },
    { status: 405 }
  );
}

export async function PATCH(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed'
    },
    { status: 405 }
  );
}