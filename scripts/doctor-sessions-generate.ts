import { getDoctorOptionsService } from '@/services/sessions.service';
import { analyseSessionsHelper } from '@/lib/helpers/doctor-sessions-generate.helper';
import moment from 'moment';

const createSessions = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    totalDoctors: number;
    successful: number;
    failed: number;
    results: Array<{
      doctorName: string;
      status: boolean;
      sessionCount?: number;
      error?: string;
    }>;
  };
  error?: {
    message?: string;
  };
}> => {
  try {
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment()
      .add(Number(process.env.SESSION_DAYS_COUNT || 90), 'days')
      .format('YYYY-MM-DD');

    // == GET ALL ACTIVE DOCTORS == //
    const doctorsResponse = await getDoctorOptionsService();

    const promises = doctorsResponse.data.map((doctor) =>
      analyseSessionsHelper({
        fromDate,
        toDate,
        doctorId: doctor.id,
        update: false
      })
    );

    const promisedData = await Promise.all(promises);

    const results = promisedData.map((result, index) => {
      const doctor = doctorsResponse.data[index];

      if (result.status === true) {
        console.log(
          `${index + 1}. SESSIONS CREATED : ${doctor.name} : ${result.data.length}`
        );
        return {
          doctorName: doctor.name,
          status: true,
          sessionCount: result.data.length
        };
      } else {
        console.log(
          `${index + 1}. SESSIONS ****FAILED **** : ${doctor.name} : NO SESSIONS`
        );
        return {
          doctorName: doctor.name,
          status: false,
          error: result.error || 'Unknown error'
        };
      }
    });

    const successful = results.filter((r) => r.status === true).length;
    const failed = results.filter((r) => r.status === false).length;

    return {
      success: true,
      message: `Sessions creation completed. ${successful} successful, ${failed} failed.`,
      data: {
        totalDoctors: doctorsResponse.totalRecords,
        successful,
        failed,
        results
      }
    };
  } catch (error: any) {
    console.error('createSessions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to create sessions'
      }
    };
  }
};

// ==== SCRIPT EXECUTION ==== //
(async () => {
  try {
    console.log('Starting session generation...');
    const result = await createSessions();
    
    if (result.success) {
      console.log('\n✅ Success:', result.message);
      if (result.data) {
        console.log(`Total Doctors: ${result.data.totalDoctors}`);
        console.log(`Successful: ${result.data.successful}`);
        console.log(`Failed: ${result.data.failed}`);
      }
      process.exit(0);
    } else {
      console.error('\n❌ Error:', result.error?.message || 'Unknown error');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message || error);
    process.exit(1);
  }
})();
