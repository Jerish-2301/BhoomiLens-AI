export interface User {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VERIFIER' | 'GIS_OFFICER' | 'AUDITOR' | 'PUBLIC';
}

export interface LandRecord {
  id: string;
  surveyNumber: string;
  ownerName: string;
  area: number;
  village: string;
  district: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}
