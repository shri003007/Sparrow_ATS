import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, action } = body;

    if (action === 'cleanup_incomplete_job' && jobId) {
      // Validate job ID
      if (!jobId || jobId.trim() === '') {
        console.warn('Attempted to cleanup job with empty or invalid ID');
        return NextResponse.json({ success: true, message: 'Invalid job ID, skipping cleanup' });
      }

      // Call the job deletion API
      const jobApiUrl = process.env.NEXT_PUBLIC_JOB_API_BASE_URL!;
      
      try {
        const response = await fetch(`${jobApiUrl}/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log(`Incomplete job ${jobId} cleaned up successfully`);
          return NextResponse.json({ success: true, message: 'Job cleaned up successfully' });
        } else {
          const errorText = await response.text();
          console.error(`Failed to cleanup job ${jobId}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          
          // For 500 errors, provide more specific logging
          if (response.status === 500) {
            console.warn('⚠️ Backend server error during job cleanup. This might be due to:');
            console.warn('   - Job has associated data (candidates, applications, etc.)');
            console.warn('   - Database constraints preventing deletion');
            console.warn('   - Backend service temporarily unavailable');
            console.warn('   - Job ID might not exist or be invalid');
          }
          
          // Don't return error for cleanup failures, just log them
          return NextResponse.json({ 
            success: true, 
            message: 'Cleanup attempted but job may not exist or have dependencies',
            error: errorText
          });
        }
      } catch (fetchError) {
        console.error('Network error during job cleanup:', fetchError);
        return NextResponse.json({ 
          success: true, 
          message: 'Cleanup attempted but network error occurred',
          error: fetchError instanceof Error ? fetchError.message : String(fetchError)
        });
      }
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in cleanup job route:', error);
    // Don't return 500 for cleanup errors, just log them
    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup attempted but encountered error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 