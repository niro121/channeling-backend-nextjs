'use client';

import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  Card,
  CardContent,
  Combobox,
  CustomCheckedField,
  CustomDatePickerField,
  CustomFormField,
  Label
} from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { HOME_TELEPHONE_REGEX, MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import { GENDER_OPTIONS, STAFF_STATUS_OPTIONS } from '@archmage/shared';

export type GeneralFormValues = {
  staffCode: string;
  title: string;
  initials: string;
  name: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  dateOfBirth: Date | undefined;
  gender: string;
  mobileNumber: string;
  homeTelephone: string;
  email: string;
  secondaryEmail: string;
  address: string;
  zoneCode: string;
  fingerPrintRfid: string;
  staffCodeLegacy: string;
  epfNumber: string;
  etfNumber: string;
  registrationNumber: string;
  dateJoined: Date | undefined;
  dateResigned: Date | undefined;
  resignedWithoutNotice: boolean;
  resignedWithNoticeDate: Date | undefined;
  dateRetired: Date | undefined;
  status: number;
  speciality: string;
};

const ZONE_CODE_OPTIONS: { id: string; name: string }[] = [];
const SPECIALITY_OPTIONS: { id: string; name: string }[] = [];

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  initials: Yup.string()
    .required('Initials is required')
    .max(50, 'Must be less than 50 characters'),
  firstName: Yup.string()
    .required('First Name is required')
    .max(100, 'Must be less than 100 characters'),
  lastName: Yup.string()
    .required('Last Name is required')
    .max(100, 'Must be less than 100 characters'),
  homeTelephone: Yup.string()
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .matches(HOME_TELEPHONE_REGEX, 'Enter a valid home telephone number')
    .notRequired(),
  secondaryEmail: Yup.string()
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .email('Enter a valid email address')
    .notRequired(),
  zoneCode: Yup.string().nullable(),
  fingerPrintRfid: Yup.string()
    .nullable()
    .max(100, 'Must be less than 100 characters'),
  staffCodeLegacy: Yup.string()
    .nullable()
    .max(50, 'Must be less than 50 characters'),
  epfNumber: Yup.string()
    .nullable()
    .max(50, 'Must be less than 50 characters'),
  etfNumber: Yup.string()
    .nullable()
    .max(50, 'Must be less than 50 characters'),
  registrationNumber: Yup.string()
    .nullable()
    .max(50, 'Must be less than 50 characters'),
  dateResigned: Yup.date().nullable(),
  resignedWithoutNotice: Yup.boolean(),
  resignedWithNoticeDate: Yup.date().nullable(),
  dateRetired: Yup.date().nullable(),
  speciality: Yup.string().nullable()
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
  dateJoined: undefined,
  dateResigned: undefined,
  resignedWithoutNotice: false,
  resignedWithNoticeDate: undefined,
  dateRetired: undefined,
  status: 1,
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

function getGenderLabel(gender: string) {
  return GENDER_OPTIONS.find((option) => option.id === gender)?.name ?? gender;
}

function getStatusLabel(status: number) {
  return (
    STAFF_STATUS_OPTIONS.find((option) => option.id === String(status))?.name ??
    String(status)
  );
}

export default function GeneralForm() {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={() => {
        // UI only — submit wiring comes later
      }}
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
                      placeholder="Staff Code"
                      value={formik.values.staffCode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="title"
                      placeholder="Title"
                      value={formik.values.title}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
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
                      placeholder="Name"
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
                      disabled
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
                      disabled
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="nic"
                      placeholder="NIC"
                      value={formik.values.nic}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
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
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />

                    <CustomFormField
                      type="text"
                      id="gender"
                      placeholder="Gender"
                      value={getGenderLabel(formik.values.gender)}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      type="text"
                      id="mobileNumber"
                      placeholder="Mobile Number"
                      value={formik.values.mobileNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
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
                      disabled
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
                      required={false}
                      disabled
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
                      placeholder="Staff Code (Legacy)"
                      value={formik.values.staffCodeLegacy}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
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
                      required={false}
                      disabled
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
                          | string
                          | undefined
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

                    <CustomFormField
                      type="text"
                      id="status"
                      placeholder="Status"
                      value={getStatusLabel(formik.values.status)}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
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
  );
}
