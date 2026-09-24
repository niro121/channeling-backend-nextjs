'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Formik, Form, FormikHelpers, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import {
  CustomAlertDialog,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
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
import { FAX_NUMBER_REGEX } from '@/lib/validations/fax';
import { NIC_REGEX } from '@/lib/validations/nic';
import { TITLE_LIST, type HrDetailFormValues, type StaffRecord } from '@/types/staff';
import {
  BLOOD_GROUP_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  GUARDIAN_RELATIONSHIP_OPTIONS,
  NATIONALITY_OPTIONS,
  RELIGION_OPTIONS,
  TRANSPORT_MODE_OPTIONS
} from '@/types/staff-personnel-options';
import { updateStaffPersonnelAction } from '@/app/actions/staff-actions/staff.actions';
import {
  getChangedChannelingFieldLabels,
  staffRecordToChannelingPayload
} from '@/lib/helpers/staff-channeling-fields.helper';
import { buildChannelingSyncDialogDescription } from '@/lib/helpers/staff-channeling-dialog.helper';
import {
  hrDetailFormValuesToPersonnelPayload,
  personnelPayloadToStaffRecordSlice,
  staffRecordToHrDetailFormValues
} from '@/lib/mappers/staff-personnel-details.mapper';

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

const optionalCount = () =>
  Yup.string()
    .nullable()
    .transform((value) => (value === '' ? '0' : value))
    .test('is-count', 'Enter a valid number', (value) => {
      if (!value) return true;
      const parsed = Number.parseInt(value, 10);
      return !Number.isNaN(parsed) && parsed >= 0;
    });

const validationSchema = Yup.object({
  title: requiredMaxString('Salutation is required', 50),
  initials: requiredMaxString('Name with initial is required', 50),
  firstName: requiredMaxString('First name is required', 100),
  lastName: requiredMaxString('Last name is required', 100),
  nic: requiredPatternString(
    'NIC is required',
    NIC_REGEX,
    'Enter a valid NIC (9 digits + V/X or 12 digits)',
    20
  ),
  dateOfBirth: requiredDate('Birthday is required').max(
    new Date(),
    'Birthday cannot be in the future'
  ),
  mobileNumber: requiredPatternString(
    'Mobile number is required',
    MOBILE_NUMBER_REGEX,
    'Enter a valid mobile number',
    15
  ),
  homeTelephone: optionalPatternString(
    HOME_TELEPHONE_REGEX,
    'Enter a valid telephone number'
  ),
  email: optionalEmail(),
  nationality: requiredString('Nationality is required'),
  bloodGroup: optionalString(),
  religion: optionalString(),
  civilStatus: optionalString(),
  gsDivision: optionalMaxString(100),
  pollingDivision: optionalMaxString(100),
  transportMode: optionalString(),
  permanentAddress: requiredMaxString('Permanent address is required', 500),
  postalAddress: optionalMaxString(500),
  faxNumber: optionalPatternString(FAX_NUMBER_REGEX, 'Enter a valid fax number'),
  spouseName: optionalMaxString(150),
  spouseOccupation: optionalMaxString(100),
  maleAbove18: optionalCount(),
  femaleAbove18: optionalCount(),
  maleBelow18: optionalCount(),
  femaleBelow18: optionalCount(),
  fatherName: optionalMaxString(150),
  fatherOccupation: optionalMaxString(100),
  motherName: optionalMaxString(150),
  motherOccupation: optionalMaxString(100),
  guardianName: optionalMaxString(150),
  guardianOccupation: optionalMaxString(100),
  guardianRelationship: optionalString(),
  guardianAddress: optionalMaxString(500),
  guardianContactNumber: optionalMaxString(15),
  fatherInLawName: optionalMaxString(150),
  fatherInLawOccupation: optionalMaxString(100),
  motherInLawName: optionalMaxString(150),
  motherInLawOccupation: optionalMaxString(100),
  inLawAddress: optionalMaxString(500),
  inLawContactNumber: optionalMaxString(15),
  emergencyContactName: requiredMaxString('Emergency contact name is required', 150),
  emergencyRelationship: requiredMaxString('Relationship is required', 100),
  emergencyAddress: optionalMaxString(500),
  emergencyContactNumber: requiredMaxString('Emergency contact number is required', 15)
});

const initialValues: HrDetailFormValues = {
  title: '',
  initials: '',
  firstName: '',
  lastName: '',
  fullName: '',
  nameWithInitials: '',
  nic: '',
  dateOfBirth: undefined,
  mobileNumber: '',
  homeTelephone: '',
  email: '',
  nationality: '',
  bloodGroup: '',
  religion: '',
  civilStatus: '',
  gsDivision: '',
  pollingDivision: '',
  transportMode: '',
  permanentAddress: '',
  postalAddress: '',
  faxNumber: '',
  spouseName: '',
  spouseOccupation: '',
  maleAbove18: '0',
  femaleAbove18: '0',
  maleBelow18: '0',
  femaleBelow18: '0',
  fatherName: '',
  fatherOccupation: '',
  motherName: '',
  motherOccupation: '',
  guardianName: '',
  guardianOccupation: '',
  guardianRelationship: '',
  guardianAddress: '',
  guardianContactNumber: '',
  fatherInLawName: '',
  fatherInLawOccupation: '',
  motherInLawName: '',
  motherInLawOccupation: '',
  inLawAddress: '',
  inLawContactNumber: '',
  emergencyContactName: '',
  emergencyRelationship: '',
  emergencyAddress: '',
  emergencyContactNumber: ''
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

type FormHrDetailProps = {
  staff: StaffRecord;
  staffId: string;
  onRegisterActions?: (actions: HrDetailFormActions) => void;
  onLoadingChange?: (loading: boolean) => void;
};

export type HrDetailFormActions = {
  submit: (saveAndClose: boolean) => void;
};

function FormActionBridge({
  onRegisterActions,
  saveAndCloseRef
}: {
  onRegisterActions?: (actions: HrDetailFormActions) => void;
  saveAndCloseRef: MutableRefObject<boolean>;
}) {
  const formik = useFormikContext<HrDetailFormValues>();

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

export default function FormHrDetail({
  staff,
  staffId,
  onRegisterActions,
  onLoadingChange
}: FormHrDetailProps) {
  const saveAndCloseRef = useRef(false);
  const pendingSubmitRef = useRef<{
    values: HrDetailFormValues;
    helpers: Pick<FormikHelpers<HrDetailFormValues>, 'setErrors' | 'setTouched'>;
    closeAfterSave: boolean;
  } | null>(null);
  const [showChannelingDialog, setShowChannelingDialog] = useState(false);
  const [channelingDialogDescription, setChannelingDialogDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const resolvedInitialValues = staffRecordToHrDetailFormValues(staff);

  const executeSave = async (
    values: HrDetailFormValues,
    syncToChanneling: boolean,
    closeAfterSave: boolean,
    { setErrors, setTouched }: Pick<FormikHelpers<HrDetailFormValues>, 'setErrors' | 'setTouched'>
  ) => {
    try {
      setIsSaving(true);
      onLoadingChange?.(true);

      const payload = hrDetailFormValuesToPersonnelPayload(values);
      const respond = await updateStaffPersonnelAction(staffId, payload, {
        syncToChanneling
      });

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
        const fieldMap: Record<string, keyof HrDetailFormValues> = {
          contactMobile: 'mobileNumber',
          title: 'title'
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
            'Staff HR details save unsuccessful.'
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

      toast({
        variant: 'success',
        title: 'Success',
        description: respond?.data?.channelingWarning
          ? 'Staff HR details were updated in HRM.'
          : syncToChanneling
            ? 'Staff HR details were updated in HRM and Channeling.'
            : 'Staff HR details were updated successfully.'
      });

      if (closeAfterSave) router.push('/staff');
      else router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Staff HR details save unsuccessful.'
      });
    } finally {
      setIsSaving(false);
      onLoadingChange?.(false);
      setShowChannelingDialog(false);
      pendingSubmitRef.current = null;
    }
  };

  const handleSubmit = async (
    values: HrDetailFormValues,
    helpers: FormikHelpers<HrDetailFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;
    const payload = hrDetailFormValuesToPersonnelPayload(values);
    const updatedSlice = personnelPayloadToStaffRecordSlice(payload);
    const originalChanneling = staffRecordToChannelingPayload(staff);
    const updatedChanneling = {
      ...originalChanneling,
      title: updatedSlice.title ?? originalChanneling.title,
      name: updatedSlice.name ?? originalChanneling.name,
      nic: updatedSlice.nic ?? originalChanneling.nic,
      dateOfBirth: updatedSlice.dateOfBirth ?? originalChanneling.dateOfBirth,
      contactMobile: updatedSlice.contactMobile ?? originalChanneling.contactMobile
    };

    const changedFields = getChangedChannelingFieldLabels(
      originalChanneling,
      updatedChanneling
    );
    const shouldPromptChanneling =
      changedFields.length > 0 || !staff.migrateSourceId;

    if (shouldPromptChanneling) {
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
          mode: 'update',
          changedFields,
          hasChannelingLink: Boolean(staff.migrateSourceId)
        })
      );
      setShowChannelingDialog(true);
      return;
    }

    await executeSave(values, false, closeAfterSave, helpers);
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
        enableReinitialize
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
                defaultValue={[
                  'personal-details',
                  'contact-information',
                  'family-information'
                ]}
                className="space-y-4"
              >
                <AccordionItem value="personal-details" className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="space-y-1 text-left">
                      <p className="text-xl font-semibold">Personal Details</p>
                      <p className="text-sm font-normal text-muted-foreground">
                        Personal information shared with the staff record.
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t-2 pt-2">
                    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                      <CustomSelectField
                        id="title"
                        placeholder="Salutation"
                        options={TITLE_LIST.map((t) => ({ id: t.name, name: t.name }))}
                        value={formik.values.title}
                        onChange={(v) => formik.setFieldValue('title', v)}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="initials"
                        placeholder="Name with Initial"
                        value={formik.values.initials}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="fullName"
                        placeholder="Name in Full"
                        value={fullName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="nameWithInitials"
                        placeholder="Name with Initials (Display)"
                        value={nameWithInitials}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled
                        required={false}
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
                      <CustomDatePickerField
                        id="dateOfBirth"
                        placeholder="Birthday"
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
                      <CustomSelectField
                        id="nationality"
                        placeholder="Nationality"
                        options={NATIONALITY_OPTIONS.map((o) => ({
                          id: o.id,
                          name: o.name
                        }))}
                        value={formik.values.nationality}
                        onChange={(v) => formik.setFieldValue('nationality', v)}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="bloodGroup"
                        placeholder="Blood Group"
                        options={BLOOD_GROUP_OPTIONS.map((o) => ({
                          id: o.id,
                          name: o.name
                        }))}
                        value={formik.values.bloodGroup}
                        onChange={(v) => formik.setFieldValue('bloodGroup', v)}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="religion"
                        placeholder="Religion"
                        options={RELIGION_OPTIONS.map((o) => ({
                          id: o.id,
                          name: o.name
                        }))}
                        value={formik.values.religion}
                        onChange={(v) => formik.setFieldValue('religion', v)}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="civilStatus"
                        placeholder="Civil Status"
                        options={CIVIL_STATUS_OPTIONS.map((o) => ({
                          id: o.id,
                          name: o.name
                        }))}
                        value={formik.values.civilStatus}
                        onChange={(v) => formik.setFieldValue('civilStatus', v)}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="gsDivision"
                        placeholder="GS Division"
                        value={formik.values.gsDivision}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="pollingDivision"
                        placeholder="Polling Division"
                        value={formik.values.pollingDivision}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="transportMode"
                        placeholder="Transport Mode"
                        options={TRANSPORT_MODE_OPTIONS.map((o) => ({
                          id: o.id,
                          name: o.name
                        }))}
                        value={formik.values.transportMode}
                        onChange={(v) => formik.setFieldValue('transportMode', v)}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contact-information" className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="space-y-1 text-left">
                      <p className="text-xl font-semibold">Contact Information</p>
                      <p className="text-sm font-normal text-muted-foreground">
                        HRM contact details. Mobile, telephone, and email are shared with the staff record.
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t-2 pt-2">
                    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                      <CustomFormField
                        type="text"
                        id="permanentAddress"
                        placeholder="Permanent Address"
                        value={formik.values.permanentAddress}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="postalAddress"
                        placeholder="Postal Address"
                        value={formik.values.postalAddress}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="homeTelephone"
                        placeholder="Telephone Number"
                        value={formik.values.homeTelephone}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
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
                        id="faxNumber"
                        placeholder="Fax Number"
                        value={formik.values.faxNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="email"
                        id="email"
                        placeholder="Email Address"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="family-information" className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="space-y-1 text-left">
                      <p className="text-xl font-semibold">Family Information</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t-2 pt-2">
                    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                      <CustomFormField
                        type="text"
                        id="spouseName"
                        placeholder="Husband/Wife Name"
                        value={formik.values.spouseName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="spouseOccupation"
                        placeholder="Spouse Occupation"
                        value={formik.values.spouseOccupation}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dependents" className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="space-y-1 text-left">
                      <p className="text-xl font-semibold">Dependents</p>
                      <p className="text-sm font-normal text-muted-foreground">
                        Number of dependents by age and gender.
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t-2 pt-2">
                    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                      {(
                        [
                          ['maleAbove18', 'Male Above 18 Years'],
                          ['femaleAbove18', 'Female Above 18 Years'],
                          ['maleBelow18', 'Male Below 18 Years'],
                          ['femaleBelow18', 'Female Below 18 Years']
                        ] as const
                      ).map(([id, placeholder]) => (
                        <CustomFormField
                          key={id}
                          type="number"
                          id={id}
                          placeholder={placeholder}
                          value={formik.values[id]}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          required={false}
                          styleClasses={fieldStyleClasses}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="parents-guardians" className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="space-y-1 text-left">
                      <p className="text-xl font-semibold">Parents / Guardians</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t-2 pt-2">
                    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                      <CustomFormField
                        type="text"
                        id="fatherName"
                        placeholder="Father Name"
                        value={formik.values.fatherName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="fatherOccupation"
                        placeholder="Father Occupation"
                        value={formik.values.fatherOccupation}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="motherName"
                        placeholder="Mother Name"
                        value={formik.values.motherName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="motherOccupation"
                        placeholder="Mother Occupation"
                        value={formik.values.motherOccupation}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="guardianName"
                        placeholder="Guardian Name"
                        value={formik.values.guardianName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="guardianOccupation"
                        placeholder="Guardian Occupation"
                        value={formik.values.guardianOccupation}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="guardianRelationship"
                        placeholder="Guardian Relationship"
                        options={GUARDIAN_RELATIONSHIP_OPTIONS.map((o) => ({
                          id: o.id,
                          name: o.name
                        }))}
                        value={formik.values.guardianRelationship}
                        onChange={(v) => formik.setFieldValue('guardianRelationship', v)}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="guardianAddress"
                        placeholder="Guardian Address"
                        value={formik.values.guardianAddress}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="guardianContactNumber"
                        placeholder="Guardian Contact Number"
                        value={formik.values.guardianContactNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="in-law-information" className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="space-y-1 text-left">
                      <p className="text-xl font-semibold">In-Law Information</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t-2 pt-2">
                    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                      <CustomFormField
                        type="text"
                        id="fatherInLawName"
                        placeholder="Father-In-Law Name"
                        value={formik.values.fatherInLawName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="fatherInLawOccupation"
                        placeholder="Father-In-Law Occupation"
                        value={formik.values.fatherInLawOccupation}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="motherInLawName"
                        placeholder="Mother-In-Law Name"
                        value={formik.values.motherInLawName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="motherInLawOccupation"
                        placeholder="Mother-In-Law Occupation"
                        value={formik.values.motherInLawOccupation}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="inLawAddress"
                        placeholder="Address"
                        value={formik.values.inLawAddress}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="inLawContactNumber"
                        placeholder="Contact Number"
                        value={formik.values.inLawContactNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="emergency-contact" className="rounded-lg border px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="space-y-1 text-left">
                      <p className="text-xl font-semibold">Emergency Contact</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t-2 pt-2">
                    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                      <CustomFormField
                        type="text"
                        id="emergencyContactName"
                        placeholder="Emergency Contact Name"
                        value={formik.values.emergencyContactName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="emergencyRelationship"
                        placeholder="Relationship"
                        value={formik.values.emergencyRelationship}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="emergencyAddress"
                        placeholder="Emergency Address"
                        value={formik.values.emergencyAddress}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        type="text"
                        id="emergencyContactNumber"
                        placeholder="Emergency Contact Number"
                        value={formik.values.emergencyContactNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                      />
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
        title="Update Channeling staff too?"
        description={`${channelingDialogDescription} Click Cancel to save in HRM only, or Continue to also apply the change in Channeling.`}
        handleContinue={handleChannelingContinue}
      />
    </>
  );
}
