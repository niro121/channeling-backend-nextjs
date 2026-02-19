'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import CustomFormField from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import CustomSelectField from '@/components/common/custom-select-field';
import { useRouter } from 'next/navigation';
import { Room, RoomFormValues } from '@/types/room';
import {
  createRoom,
  getAllZonesByLocaionID,
  updateOneRoom
} from '@/app/actions/room.actions';
import { Zone } from '@/types/zone';
import { Loader } from 'lucide-react';

type RoomFormProps = {
  room: Room | null;
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
  locationOptions: { id: string; name: string }[];
};

export default function RoomForm({
  room,
  user,
  locationOptions
}: RoomFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const [zoneOptions, setZoneOptions] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [zoneloading, setZoneLoading] = React.useState<boolean>(false);

  // Load zone options for initial location when editing (so Zone dropdown shows selected zone)
  React.useEffect(() => {
    const locationId = room?.locationId ?? '';
    if (!locationId) return;
    let cancelled = false;
    setZoneLoading(true);
    getAllZonesByLocaionID(locationId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setZoneOptions(
          result.data.map((z) => ({ id: z.id, name: z.name }))
        );
      }
      setZoneLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [room?.locationId]);

  const initialValues: RoomFormValues = {
    number: room?.number ?? '',
    locationId: room?.locationId ?? '',
    zoneId: room?.zoneId ?? '',
    description: room?.description ? room.description : '',
    status: room?.status ? room.status : 1
  };

  const validationSchema = Yup.object({
    number: Yup.string()
      .max(100, 'Must be less than 100 characters')
      .required('This field is mandatory'),
    locationId: Yup.string().required('This field is mandatory'),
    zoneId: Yup.string().required('This field is mandatory'),
    description: Yup.string().max(500, 'Must be less than 500 characters'),
    status: Yup.number()
      .oneOf([0, 1], 'Visibility must be Unpublish (0) or Publish (1)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: RoomFormValues,
    { resetForm, setErrors, setTouched }: FormikHelpers<RoomFormValues>
  ) => {
    try {
      let respond: any;

      setLoading(true);

      if (room && room.id) {
        respond = await updateOneRoom(room.id, values);

        setLoading(false);

        if (!respond?.success) {
          // Handle server-side validation errors
          if (respond?.error?.issues) {
            const fieldErrors: any = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errors = respond.error.issues[key];
              if (Array.isArray(errors) && errors.length > 0) {
                fieldErrors[key] = errors[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as any)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error?.message || 'Room update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Room was updated successfully'
        });

        router.push('/rooms');
      } else {
        respond = await createRoom(values, user);

        setLoading(false);

        if (!respond?.success) {
          // Handle server-side validation errors
          if (respond?.error?.issues) {
            const fieldErrors: any = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errors = respond.error.issues[key];
              if (Array.isArray(errors) && errors.length > 0) {
                fieldErrors[key] = errors[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as any)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error?.message || 'Room save unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Room was created successfully'
        });
        router.push('/rooms');
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Room save unsuccessful.'
      });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {(formik) => {
        const styleClasses = {
          parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
          labelClassName: 'text-sm text-black font-semibold capitalize',
          inputClassName: 'col-span-full sm:col-span-3'
        };

        const setLocationHandler = async (value: string) => {
          formik.setFieldValue('locationId', value);
          setZoneLoading(true);

          try {
            const result = await getAllZonesByLocaionID(value);

            if (result.success) {
              const mappedZones = result.data?.map((z) => ({
                id: z.id,
                name: z.name
              }));

              setZoneOptions(mappedZones || []);
            } else {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Getting zones unsuccessful.'
              });
              setZoneLoading(false);
            }
          } catch (error: any) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Getting zones unsuccessful.'
            });
          } finally {
            setZoneLoading(false);
          }
        };

        return (
          <Form className="w-full">
            <div className="grid gap-4 border rounded-lg p-6">
              <CustomFormField
                type="text"
                id="number"
                placeholder="Room Number"
                value={formik.values.number}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <CustomSelectField
                id="locationId"
                placeholder="Location"
                value={formik.values.locationId}
                onChange={setLocationHandler}
                required
                options={locationOptions}
                styleClasses={styleClasses}
              />
              {
                <div className='relative'>
                  <>
                    {zoneloading && <Loader className="w-4 h-4 animate-spin absolute left-1/2 top-1/4" />}
                    <CustomSelectField
                      id="zoneId"
                      placeholder="Zone"
                      disabled={zoneloading || zoneOptions.length === 0}
                      value={
                        formik.values.zoneId && zoneOptions.some((o) => o.id === formik.values.zoneId)
                          ? formik.values.zoneId
                          : undefined
                      }
                      onChange={(value: string) => formik.setFieldValue('zoneId', value)}
                      required
                      options={zoneOptions}
                      styleClasses={styleClasses}
                    />
                  </>
                </div>
              }
              <CustomFormField
                type="textarea"
                id="description"
                placeholder="Description"
                value={formik.values.description || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomSelectField
                id="status"
                placeholder="Status"
                value={formik.values.status?.toString()}
                onChange={(value) =>
                  formik.setFieldValue('status', parseInt(value))
                }
                required
                options={[
                  { id: '0', name: 'Unpublish' },
                  { id: '1', name: 'Publish' }
                ]}
                styleClasses={styleClasses}
              />

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  onClick={() => {
                    router.push('/rooms');
                  }}
                  disabled={loading}
                >
                  <Ban className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  disabled={loading}
                  size={'sm'}
                  type="submit"
                  className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
