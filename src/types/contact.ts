export type ContactSubmissionStatus = "unread" | "read" | "resolved";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactSubmissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSubmissionsResponse {
  submissions: ContactSubmission[];
  totalCount: number;
  page: number;
  totalPages: number;
  counts: {
    total: number;
    unread: number;
    read: number;
    resolved: number;
  };
}
