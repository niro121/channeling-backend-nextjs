'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Formik, Form, FormikHelpers, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  Combobox,
  CustomAlertDialog,
  CustomCheckedField,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label,
  useToast
} from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  HOME_TELEPHONE_REGEX,
  MOBILE_NUMBER_REGEX
} from '@/lib/validations/phone-mobile';
import { NIC_REGEX } from '@/lib/validations/nic';
import {
  GENDER_OPTIONS,
  STAFF_STATUS_OPTIONS,
  TITLE_LIST,
  StaffRecord
} from '@/types/staff';
import type { GeneralFormValues } from '@/types/staff';
import {
  createStaffAction,
  updateStaffAction
} from '@/app/actions/staff-actions/staff.actions';
import {
  generalFormValuesToStaffPayload,
  staffRecordToGeneralFormValues
} from '@/lib/mappers/staff-general-form.mapper';
import { getChangedChannelingFieldLabels } from '@/lib/helpers/staff-channeling-fields.helper';
import { buildChannelingSyncDialogDescription } from '@/lib/helpers/staff-channeling-dialog.helper';

export type { GeneralFormValues } from '@/types/staff';

const ZONE_CODE_OPTIONS: { id: string; name: string }[] = [];
const SPECIALITY_OPTIONS: { id: string; name: string }[] = [];

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const optionalString = () =>
  Yup.string()
    .nullable()
    .transform((value) => (value === '' ? null : value));

const optionalMaxString = (max: number) =>
  optionalString().max(max, `Must be less than ${max} characters`);

const optionalPatternString = (pattern: RegExp, message: string) =>
  optionalString().test('format', message, (value) => !value || pattern.test(value));

const optionalEmail = () =>
  optionalString().email('Enter a valid email address');

const optionalDate = () =>
  Yup.date()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === '' || originalValue === undefined ? null : value
    )
    .typeError('Enter a valid date');

const requiredString = (message: string) =>
  Yup.string().trim().required(message);

const requiredMaxString = (message: string, max: number) =>
  requiredString(message).max(max, `Must be less than ${max} characters`);

const requiredPatternString = (
  message: string,
  pattern: RegExp,
  patternMessage: string,
  max?: number
) => {
  let schema = requiredString(message).matches(pattern, patternMessage);
  if (max) {
    schema = schema.max(max, `Must be less than ${max} characters`);
  }
  return schema;
};

const requiredDate = (message: string) =>
  Yup.date()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === '' || originalValue === undefined ? null : value
    )
    .typeError('Enter a valid date')
    .required(message);

const validationSchema = Yup.object({
  staffCode: optionalMaxString(50),
  title: optionalMaxString(50),
  initials: Yup.string()
    .required('Initials is required')
    .max(50, 'Must be less than 50 characters'),
  name: optionalMaxString(150),
  firstName: Yup.string()
    .required('First Name is required')
    .max(100, 'Must be less than 100 characters'),
  lastName: Yup.string()
    .required('Last Name is required')
    .max(100, 'Must be less than 100 characters'),
  nic: requiredPatternString(
    'NIC is required',
    NIC_REGEX,
    'Enter a valid NIC (9 digits + V/X or 12 digits)',
    20
  ),
  dateOfBirth: requiredDate('Date of Birth is required').max(
    new Date(),
    'Date of Birth cannot be in the future'
  ),
  gender: requiredString('Gender is required').oneOf(
    GENDER_OPTIONS.map((option) => option.id),
    'Select a valid gender'
  ),
  mobileNumber: requiredPatternString(
    'Mobile Number is required',
    MOBILE_NUMBER_REGEX,
    'Enter a valid mobile number',
    15
  ),
  homeTelephone: optionalPatternString(
    HOME_TELEPHONE_REGEX,
    'Enter a valid home telephone number'
  ),
  email: optionalEmail(),
  secondaryEmail: optionalEmail(),
  address: requiredMaxString('Address is required', 500),
  zoneCode: optionalString(),
  fingerPrintRfid: optionalMaxString(100),
  staffCodeLegacy: optionalMaxString(50),
  epfNumber: optionalMaxString(50),
  etfNumber: optionalMaxString(50),
  registrationNumber: optionalMaxString(50),
  dateJoined: requiredDate('Date Joined is required'),
  dateResigned: optionalDate(),
  resignedWithoutNotice: Yup.boolean(),
  resignedWithNoticeDate: optionalDate(),
  dateRetired: optionalDate(),
  status: Yup.string()
    .required('Status is required')
    .oneOf(
      STAFF_STATUS_OPTIONS.map((option) => option.id),
      'Select a valid status'
    ),
  speciality: optionalString()
}).test('employment-dates', function validateEmploymentDates(values) {
  if (!values) return true;

  const { dateJoined, dateResigned, resignedWithNoticeDate, dateRetired } =
    values;

  if (dateJoined && dateResigned && dateResigned < dateJoined) {
    return this.createError({
      path: 'dateResigned',
      message: 'Date Resigned cannot be before Date Joined'
    });
  }

  if (dateJoined && dateRetired && dateRetired < dateJoined) {
    return this.createError({
      path: 'dateRetired',
      message: 'Date Retired cannot be before Date Joined'
    });
  }

  if (dateResigned && resignedWithNoticeDate && resignedWithNoticeDate > dateResigned) {
    return this.createError({
      path: 'resignedWithNoticeDate',
      message: 'Resigned with Notice Date cannot be after Date Resigned'
    });
  }

  return true;
});

const initialValues: GeneralFormValues = {
  staffCode: '',
  title: '',
  initials: '',
  name: '',
  firstName: '',
  lastName: '',
  fullName: '',
  nameWithInitials: '',
  nic: '',
  dateOfBirth: undefined,
  gender: '',
  mobileNumber: '',
  homeTelephone: '',
  email: '',
  secondaryEmail: '',
  address: '',
  zoneCode: '',
  fingerPrintRfid: '',
  staffCodeLegacy: '',
  epfNumber: '',
  etfNumber: '',
  registrationNumber: '',
  dateJoined: new Date(),
  dateResigned: undefined,
  resignedWithoutNotice: false,
  resignedWithNoticeDate: undefined,
  dateRetired: undefined,
  status: STAFF_STATUS_OPTIONS[1].id,
  speciality: ''
};

function getFullName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function getNameWithInitials(
  initials: string,
  firstName: string,
  lastName: string
) {
  return [initials, firstName, lastName].filter(Boolean).join(' ').trim();
}

type GeneralFormProps = {
  staff?: StaffRecord | GeneralFormValues | null;
  staffId?: string;
  isEditPage?: boolean;
  onRegisterActions?: (actions: GeneralFormActions) => void;
  onLoadingChange?: (loading: boolean) => void;
};

export type GeneralFormActions = {
  submit: (saveAndClose: boolean) => void;
};

function FormActionBridge({
  onRegisterActions,
  saveAndCloseRef
}: {
  onRegisterActions?: (actions: GeneralFormActions) => void;
  saveAndCloseRef: MutableRefObject<boolean>;
}) {
  const formik = useFormikContext<GeneralFormValues>();

  useEffect(() => {
    onRegisterActions?.({
      submit: (saveAndClose) => {
        saveAndCloseRef.current = saveAndClose;
        void formik.submitForm();
      }
    });
  }, [formik.submitForm, onRegisterActions, saveAndCloseRef]);

  return null;
}

export default function GeneralForm({
  staff,
  staffId,
  isEditPage = false,
  onRegisterActions,
  onLoadingChange
}: GeneralFormProps) {
  const saveAndCloseRef = useRef(false);
  const pendingSubmitRef = useRef<{
    values: GeneralFormValues;
    helpers: Pick<FormikHelpers<GeneralFormValues>, 'setErrors' | 'setTouched'>;
    closeAfterSave: boolean;
  } | null>(null);
  const [showChannelingDialog, setShowChannelingDialog] = useState(false);
  const [channelingDialogDescription, setChannelingDialogDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const staffRecord = staff && 'code' in staff ? staff : null;

  const resolvedInitialValues: GeneralFormValues = staffRecord
    ? staffRecordToGeneralFormValues(staffRecord)
    : staff && 'staffCode' in staff
      ? staff
      : initialValues;

  const executeSave = async (
    values: GeneralFormValues,
    syncToChanneling: boolean,
    closeAfterSave: boolean,
    { setErrors, setTouched }: Pick<FormikHelpers<GeneralFormValues>, 'setErrors' | 'setTouched'>
  ) => {
    try {
      setIsSaving(true);
      onLoadingChange?.(true);

      const payload = generalFormValuesToStaffPayload(values);
      let respond: {
        isError?: boolean;
        errors?: Record<string, string | string[]> | { message?: string };
        data?: {
          saved?: boolean;
          id?: string;
          channelingWarning?: string;
        } | null;
      };

      if (isEditPage && staffId) {
        respond = await updateStaffAction(staffId, payload, { syncToChanneling });
      } else {
        respond = await createStaffAction(payload, { syncToChanneling });
      }

      if (
        respond?.isError &&
        respond?.errors &&
        typeof respond.errors === 'object' &&
        !Array.isArray(respond.errors)
      ) {
        const fieldErrors: Record<string, string> = {};
        const errorMap = respond.errors as Record<
          string,
          string | string[] | undefined
        >;
        const fieldMap: Record<string, keyof GeneralFormValues> = {
          code: 'staffCode',
          contactMobile: 'mobileNumber',
          name: 'firstName',
          dateOfBirth: 'dateOfBirth',
          dateJoined: 'dateJoined'
        };

        Object.keys(errorMap).forEach((key) => {
          if (key === 'message') return;
          const err = errorMap[key];
          const msg =
            Array.isArray(err) && err.length > 0
              ? err[0]
              : typeof err === 'string'
                ? err
                : undefined;
          if (!msg) return;
          const formKey = fieldMap[key] ?? key;
          fieldErrors[formKey] = msg;
        });

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          setTouched(
            Object.keys(fieldErrors).reduce(
              (acc, key) => ({ ...acc, [key]: true }),
              {} as Record<string, boolean>
            )
          );
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            ((respond.errors as Record<string, unknown>)?.message as string) ??
            'Staff save unsuccessful.'
        });
        return;
      }

      if (respond?.data?.channelingWarning) {
        toast({
          variant: 'destructive',
          title: 'Channeling sync warning',
          description: respond.data.channelingWarning
        });
      }

      if (isEditPage) {
        toast({
          variant: 'success',
          title: 'Success',
          description: respond?.data?.channelingWarning
            ? 'Staff was updated in HRM.'
            : syncToChanneling
              ? 'Staff was updated in HRM and Channeling.'
              : 'Staff was updated successfully.'
        });
        if (closeAfterSave) router.push('/staff');
        else router.refresh();
      } else {
        toast({
          variant: 'success',
          title: 'Success',
          description: respond?.data?.channelingWarning
            ? 'Staff was created in HRM.'
            : syncToChanneling
              ? 'Staff was created in HRM and Channeling.'
              : 'Staff was created successfully.'
        });
        const newId = respond?.data?.id;
        if (closeAfterSave) router.push('/staff');
        else if (newId) router.push(`/staff/${newId}/edit`);
        else router.push('/staff');
      }
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Staff save unsuccessful.'
      });
    } finally {
      setIsSaving(false);
      onLoadingChange?.(false);
      setShowChannelingDialog(false);
      pendingSubmitRef.current = null;
    }
  };

  const handleSubmit = async (
    values: GeneralFormValues,
    helpers: FormikHelpers<GeneralFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;
    const payload = generalFormValuesToStaffPayload(values);

    const shouldPromptChanneling = isEditPage
      ? staffRecord
        ? getChangedChannelingFieldLabels(staffRecord, payload).length > 0 ||
          !staffRecord.migrateSourceId
        : false
      : false;

    if (shouldPromptChanneling) {
      const changedFields = staffRecord
        ? getChangedChannelingFieldLabels(staffRecord, payload)
        : [];

      pendingSubmitRef.current = {
        values,
        helpers: {
          setErrors: helpers.setErrors,
          setTouched: helpers.setTouched
        },
        closeAfterSave
      };
      setChannelingDialogDescription(
        buildChannelingSyncDialogDescription({
          mode: isEditPage ? 'update' : 'create',
          changedFields,
          hasChannelingLink: Boolean(staffRecord?.migrateSourceId)
        })
      );
      setShowChannelingDialog(true);
      return;
    }

    await executeSave(values, !isEditPage, closeAfterSave, helpers);
  };

  const handleChannelingContinue = async () => {
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    await executeSave(
      pending.values,
      true,
      pending.closeAfterSave,
      pending.helpers
    );
  };

  const handleChannelingDialogVisibility = (open: boolean) => {
    if (!open && pendingSubmitRef.current) {
      const pending = pendingSubmitRef.current;
      void executeSave(
        pending.values,
        false,
        pending.closeAfterSave,
        pending.helpers
      );
      return;
    }
    setShowChannelingDialog(open);
  };

  return (
    <>
    <Formik
      initialValues={resolvedInitialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize={isEditPage}
    >
      {(formik) => {
        const fullName = getFullName(
          formik.values.firstName,
          formik.values.lastName
        );
        const nameWithInitials = getNameWithInitials(
          formik.values.initials,
          formik.values.firstName,
          formik.values.lastName
        );

        return (
          <Form className="w-full">
            <FormActionBridge
              onRegisterActions={onRegisterActions}
              saveAndCloseRef={saveAndCloseRef}
            />
            <Accordion
              multiple
              defaultValue={['personal-information', 'employment-reference']}
              className="space-y-4"
            >
              <AccordionItem
                value="personal-information"
                className="rounded-lg border px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="space-y-1 text-left">
                    <p className="text-base font-semibold">
                      Personal Information
                    </p>
                    <p className="text-sm font-normal text-muted-foreground">
                      This section is used to capture the personal information
                      of the staff.
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pb-2">
                    <CustomFormField
                      type="text"
                      id="staffCode"
                      placeholder="Staff Code (Auto Generated)"
                      value={formik.values.staffCode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomSelectField
                      id="title"
                      placeholder="Title"
                      options={TITLE_LIST.map((t) => ({
                        id: t.name,
                        name: t.name
                      }))}
                      value={formik.values.title?.toString() ?? ''}
                      onChange={(v) => formik.setFieldValue('title', v)}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="initials"
                      placeholder="Initials"
                      value={formik.values.initials}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="name"
                      placeholder="Name (Channeling Record)"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="firstName"
                      placeholder="First Name"
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="lastName"
                      placeholder="Last Name"
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="fullName"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="nameWithInitials"
                      placeholder="Name with Initials"
                      value={nameWithInitials}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="nic"
                      placeholder="NIC"
                      value={formik.values.nic}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomDatePickerField
                      id="dateOfBirth"
                      placeholder="Date of Birth"
                      value={formik.values.dateOfBirth}
                      onChange={(date) =>
                        formik.setFieldValue('dateOfBirth', date ?? undefined)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                      error={formik.errors.dateOfBirth as string | undefined}
                      touched={formik.touched.dateOfBirth}
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />

                    <CustomSelectField
                      id="gender"
                      placeholder="Gender"
                      options={GENDER_OPTIONS.map((g) => ({
                        id: g.id,
                        name: g.name
                      }))}
                      value={formik.values.gender?.toString() ?? ''}
                  onChange={(v) => formik.setFieldValue('gender', v)}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="mobileNumber"
                      placeholder="Mobile Number"
                      value={formik.values.mobileNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="homeTelephone"
                      placeholder="Home Telephone"
                      value={formik.values.homeTelephone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="email"
                      id="email"
                      placeholder="Email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="email"
                      id="secondaryEmail"
                      placeholder="Secondary Email"
                      value={formik.values.secondaryEmail}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="textarea"
                      id="address"
                      placeholder="Address"
                      value={formik.values.address}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <div className={fieldStyleClasses.parentDiv}>
                      <Label className={fieldStyleClasses.labelClassName}>
                        Zone Code
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Zone Code"
                          options={ZONE_CODE_OPTIONS}
                          value={formik.values.zoneCode}
                          defaultValue=""
                          clearable
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) =>
                            formik.setFieldValue('zoneCode', value)
                          }
                        />
                      </div>
                    </div>

                    <CustomFormField
                      type="text"
                      id="fingerPrintRfid"
                      placeholder="Finger Print / RFID"
                      value={formik.values.fingerPrintRfid}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="employment-reference"
                className="rounded-lg border px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="space-y-1 text-left">
                    <p className="text-base font-semibold">
                      Employment Reference
                    </p>
                    <p className="text-sm font-normal text-muted-foreground">
                      This section is used to capture the employment reference
                      of the staff.
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pb-2">
                    <CustomFormField
                      type="text"
                      id="staffCodeLegacy"
                      placeholder="Staff Code (Legacy - Auto Generated)"
                      value={formik.values.staffCodeLegacy}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="epfNumber"
                      placeholder="EPF Number"
                      value={formik.values.epfNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="etfNumber"
                      placeholder="ETF Number"
                      value={formik.values.etfNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="registrationNumber"
                      placeholder="Registration Number"
                      value={formik.values.registrationNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomDatePickerField
                      id="dateJoined"
                      placeholder="Date Joined"
                      value={formik.values.dateJoined}
                      onChange={(date) =>
                        formik.setFieldValue('dateJoined', date ?? undefined)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                      captionLayout="dropdown"
                      fromYear={1990}
                      toYear={new Date().getFullYear() + 1}
                    />

                    <CustomDatePickerField
                      id="dateResigned"
                      placeholder="Date Resigned"
                      value={formik.values.dateResigned}
                      onChange={(date) =>
                        formik.setFieldValue('dateResigned', date ?? undefined)
                      }
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                      error={formik.errors.dateResigned as string | undefined}
                      touched={formik.touched.dateResigned}
                      captionLayout="dropdown"
                      fromYear={1990}
                      toYear={new Date().getFullYear() + 1}
                    />

                    <div className="md:col-span-2">
                      <Card>
                        <CardContent className="pt-6">
                          <CustomCheckedField
                            id="resignedWithoutNotice"
                            placeholder=""
                            value={formik.values.resignedWithoutNotice}
                            onChange={() =>
                              formik.setFieldValue(
                                'resignedWithoutNotice',
                                !formik.values.resignedWithoutNotice
                              )
                            }
                            required={false}
                            options={[
                              {
                                id: true,
                                name: 'Employee resigned without giving prior notice'
                              }
                            ]}
                            styleClasses={{
                              parentDiv: '',
                              labelClassName: 'hidden',
                              inputClassName: ''
                            }}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <CustomDatePickerField
                      id="resignedWithNoticeDate"
                      placeholder="Resigned with Notice Date"
                      value={formik.values.resignedWithNoticeDate}
                      onChange={(date) =>
                        formik.setFieldValue(
                          'resignedWithNoticeDate',
                          date ?? undefined
                        )
                      }
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                      error={
                        formik.errors.resignedWithNoticeDate as
                          string | undefined
                      }
                      touched={formik.touched.resignedWithNoticeDate}
                      captionLayout="dropdown"
                      fromYear={1990}
                      toYear={new Date().getFullYear() + 1}
                    />

                    <CustomDatePickerField
                      id="dateRetired"
                      placeholder="Date Retired"
                      value={formik.values.dateRetired}
                      onChange={(date) =>
                        formik.setFieldValue('dateRetired', date ?? undefined)
                      }
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                      error={formik.errors.dateRetired as string | undefined}
                      touched={formik.touched.dateRetired}
                      captionLayout="dropdown"
                      fromYear={1990}
                      toYear={new Date().getFullYear() + 1}
                    />

                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      options={STAFF_STATUS_OPTIONS.map((s) => ({
                        id: s.id,
                        name: s.name
                      }))}
                      value={formik.values.status?.toString() ?? ''}
                      onChange={(v) => formik.setFieldValue('status', v)}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <div className={fieldStyleClasses.parentDiv}>
                      <Label className={fieldStyleClasses.labelClassName}>
                        Speciality
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Speciality"
                          options={SPECIALITY_OPTIONS}
                          value={formik.values.speciality}
                          defaultValue=""
                          clearable
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) =>
                            formik.setFieldValue('speciality', value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Form>
        );
      }}
    </Formik>

    <CustomAlertDialog
      open={showChannelingDialog}
      handleVisibilityChange={handleChannelingDialogVisibility}
      loading={isSaving}
      title={isEditPage ? 'Update Channeling staff too?' : 'Create Channeling staff too?'}
      description={`${channelingDialogDescription} Click Cancel to save in HRM only, or Continue to also apply the change in Channeling.`}
      handleContinue={handleChannelingContinue}
    />
    </>
  );
}
