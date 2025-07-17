import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'userRole'
})
export class UserRolePipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return '';
    
    const roleMap: { [key: string]: string } = {
      'ADMIN': 'Administrator',
      'LAB_TECHNICIAN': 'Lab Technician',
      'NURSE': 'Nurse',
      'DOCTOR': 'Doctor',
      'RESEARCHER': 'Researcher',
      'COMPLIANCE_OFFICER': 'Compliance Officer',
      'AUDITOR': 'Auditor',
      'TRANSPORT_STAFF': 'Transport Staff'
    };
    
    return roleMap[value] || value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}