export type VehicleType = "VAN" | "BIKE" | "LORRY" | "TRUCK";

export type DriverApplicationStatus =
  | "PENDING"
  | "NEEDS_INFO"
  | "APPROVED"
  | "REJECTED";

export type DriverStatus = "AVAILABLE" | "BUSY" | "OFFLINE" | "SUSPENDED";

export type DriverApplication = {
  id: string;

  vehicleType: VehicleType;
  plateNumber: string;

  applicationStatus?: DriverApplicationStatus;
  status?: DriverStatus;

  proofOfOwnershipPath: string;
  vehicleLicensePath: string;
  hackneyPermitPath: string;
  vehicleInsurancePath: string;
  vehicleVideoPath: string;

  driversLicensePath: string;
  meansOfIdPath: string;

  driverName: string;
  driverAddress: string;
  driverFacePhotoPath: string;
  driverFullBodyPhotoPath: string;

  guarantorName: string;
  guarantorAddress: string;
  guarantorPhone: string;
  guarantorNin: string;
  guarantorMeansOfIdPath: string;

  createdAt: string;
  updatedAt: string;
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  VAN: "Van",
  BIKE: "Bike",
  LORRY: "Lorry",
  TRUCK: "Truck",
};

export const DRIVER_APPLICATION_STATUS_LABELS: Record<
  DriverApplicationStatus,
  string
> = {
  PENDING: "Pending",
  NEEDS_INFO: "Needs info",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  OFFLINE: "Offline",
  SUSPENDED: "Suspended",
};
