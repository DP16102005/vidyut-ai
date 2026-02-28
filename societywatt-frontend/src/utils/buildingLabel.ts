export const getBuildingLabel = (type: string) => ({
    residential_society: {
        singular: 'Society', plural: 'Societies',
        unitLabel: 'flat', unitsLabel: 'flats',
        intensityLabel: 'kWh/flat/month',
        memberLabel: 'residents',
    },
    office: {
        singular: 'Building', plural: 'Buildings',
        unitLabel: 'employee', unitsLabel: 'employees',
        intensityLabel: 'kWh/employee/month',
        memberLabel: 'employees',
    },
    school: {
        singular: 'School', plural: 'Schools',
        unitLabel: 'student', unitsLabel: 'students',
        intensityLabel: 'kWh/student/month',
        memberLabel: 'students',
    },
    hospital: {
        singular: 'Hospital', plural: 'Hospitals',
        unitLabel: 'bed', unitsLabel: 'beds',
        intensityLabel: 'kWh/bed/month',
        memberLabel: 'beds',
    },
    mall: {
        singular: 'Mall', plural: 'Malls',
        unitLabel: 'tenant', unitsLabel: 'tenants',
        intensityLabel: 'kWh/tenant/month',
        memberLabel: 'tenants',
    },
    hotel: {
        singular: 'Hotel', plural: 'Hotels',
        unitLabel: 'room', unitsLabel: 'rooms',
        intensityLabel: 'kWh/room/month',
        memberLabel: 'rooms',
    },
    factory: {
        singular: 'Factory', plural: 'Factories',
        unitLabel: 'worker', unitsLabel: 'workers',
        intensityLabel: 'kWh/worker/month',
        memberLabel: 'workers',
    },
    religious: {
        singular: 'Building', plural: 'Buildings',
        unitLabel: 'daily visitor',
        unitsLabel: 'daily visitors',
        intensityLabel: 'kWh/100 visitors/month',
        memberLabel: 'visitors',
    },
    government: {
        singular: 'Building', plural: 'Buildings',
        unitLabel: 'staff member', unitsLabel: 'staff',
        intensityLabel: 'kWh/staff/month',
        memberLabel: 'staff',
    },
}[type] ?? {
    singular: 'Building', plural: 'Buildings',
    unitLabel: 'unit', unitsLabel: 'units',
    intensityLabel: 'kWh/unit/month',
    memberLabel: 'occupants',
});
