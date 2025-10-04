import { NextRequest, NextResponse } from 'next/server';
import { validateUser, createSession } from '../../../lib/auth';

/**
 * Interface for login request body
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interface for successful login response
 */
interface LoginSuccessResponse {
  success: true;
  message: string;
  user: {
    email: string;
  };
}

/**
 * Interface for error response
 */
interface LoginErrorResponse {
  success: false;
  error: string;
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

/**
 * Handles POST requests for user authentication
 * @param request - NextRequest object containing the login credentials
 * @returns NextResponse with authentication result
 */
export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password required"
        } as LoginErrorResponse,
        { status: 400 }
      );
    }

    // Validate request body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password required"
        } as LoginErrorResponse,
        { status: 400 }
      );
    }

    const loginData = body as Partial<LoginRequest>;

    // Validate that email and password are present
    if (!loginData.email || !loginData.password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password required"
        } as LoginErrorResponse,
        { status: 400 }
      );
    }

    // Validate user credentials using auth utilities
    const isValidUser = await validateUser(loginData.email, loginData.password);

    if (!isValidUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials"
        } as LoginErrorResponse,
        { status: 401 }
      );
    }

    // If valid, create session
    const session = await createSession(loginData.email);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          email: loginData.email
        }
      } as LoginSuccessResponse,
      { status: 200 }
    );

  } catch (error) {
    // Handle unexpected errors
    console.error('Auth API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error"
      } as LoginErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed"
    } as LoginErrorResponse,
    { status: 405 }
  );
}