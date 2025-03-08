import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for admin checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API handler to manually trigger the safety metrics update
 * This requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }
    
    // Check if user is an admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Run the Python script for updating safety metrics
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'safety_metrics_processor.py');
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [scriptPath]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'Safety metrics update completed successfully',
            output
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            message: `Safety metrics update failed with code ${code}`,
            error: errorOutput
          }, { status: 500 }));
        }
      });
      
      pythonProcess.on('error', (error) => {
        resolve(NextResponse.json({
          success: false,
          message: 'Failed to start Python process',
          error: error.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error('Error in safety metrics update API:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * API handler to check the status of safety metrics
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('safety_metrics')
      .select('city, lastUpdated')
      .order('lastUpdated', { ascending: false })
      .limit(1);
      
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({
        initialized: false,
        message: 'Safety metrics have not been initialized yet'
      });
    }
    
    const lastUpdated = new Date(data[0].lastUpdated);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    
    return NextResponse.json({
      initialized: true,
      lastUpdated: data[0].lastUpdated,
      daysSinceUpdate,
      needsUpdate: daysSinceUpdate > 30
    });
  } catch (error) {
    console.error('Error checking safety metrics status:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 