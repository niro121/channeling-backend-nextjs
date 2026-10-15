"use client"

import React, { useRef, useState } from "react"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { ErrorMessage } from "formik"
import Image from "next/image"
import { BinIcon } from "../icons"
import { Button } from "../ui/button"
import { UploadIcon } from "lucide-react"

interface CustomImageProps {
  id: string
  placeholder: string
  value: any
  disabled?: boolean
  required: boolean
  accept: string
  loading: boolean
  onImageSelect: (value: any) => void
  styleClasses?: {
    parentDiv: string
    labelClassName: string
    inputClassName: string
  }
}

const ImagePicker = ({
  id,
  placeholder,
  required,
  accept,
  value,
  loading,
  onImageSelect,
  styleClasses,
}: CustomImageProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pickedImage, setPickedImage] = useState<File | null>()

  const handleClick = () => {
    if (fileInputRef) {
      fileInputRef.current?.click()
    }
  }

  const handleImageChange = (event: React.ChangeEvent) => {
    const input = event.target as HTMLInputElement

    const file = input.files?.[0]

    if (!file) {
      return
    }

    setPickedImage(file)

    const fileReader = new FileReader()

    fileReader.onload = () => {
      onImageSelect(fileReader.result)
    }

    fileReader.readAsDataURL(file)
  }
  return (
    <div className={styleClasses?.parentDiv}>
      <Label htmlFor={id} className={styleClasses?.labelClassName || ""}>
        {placeholder}
        {required && <span className="text-red-600"> *</span>}
      </Label>
      {value && (
        <div
          className={`w-fit h-[200px] sm:h-[350px] image-wrapper relative ${
            styleClasses?.inputClassName || ""
          }`}
        >
          <div className="w-full h-full flex justify-start">
            <Image src={value} alt="picked-image" width={350} height={400} className="w-fit max-w-full h-auto border border-primary" unoptimized/>
          </div>
          <div className="absolute top-0 right-0">
            <Button
              size="icon"
              type="button"
              onClick={() => {
                setPickedImage(null)
                onImageSelect("")
              }}
              disabled={loading}
              className="rounded-none border-primary shadow-2xl! shadow-black! hover:bg-primary!"
              style={{ backgroundColor: "rgba(249, 207, 43, 0.8)" }}
            >
              <BinIcon className="text-red-600 cursor-pointer" />
            </Button>
          </div>
        </div>
      )}
      <div>
        <Input
          type="file"
          id={id}
          accept={accept}
          name={id}
          onChange={handleImageChange}
          disabled={value}
          className="hidden"
          ref={fileInputRef}
        />
        {!value && (
          <div>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleClick}
              disabled={loading}
              className="flex items-center gap-2 border-primary text-primary transition-colors ease-in-out duration-100 hover:bg-primary hover:text-black"
            >
              <UploadIcon className="w-5 h-5" />
              Upload image
            </Button>
            <Label> {pickedImage?.name} </Label>
          </div>
        )}
      </div>
      <ErrorMessage
        name={id}
        component="div"
        className="invalid-feedback text-red-600 whitespace-nowrap text-sm pt-1 sm:pt-0"
      />
    </div>
  )
}

export default ImagePicker
