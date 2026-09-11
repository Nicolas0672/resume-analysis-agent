# Resume Application Platform

## Problem

Job applicants spend significant time repeatedly prompting AI to help analyze and tailor resumes to job details.
Current AI Resume services focus on speed, losing control over context placed when tailoring resume

## Goal

Provide an AI-assisted workflow that helps tailor resume by analyzing their entire work and experience history from candidate data and published resume.
Once done, it will surface gaps and areas to target which executes the workflow where users will be asked several question to gain context to later
tailor the resume

## Current MVP

- Resume upload
- Resume processing
- Job link input
- Job analysis
- Interview Agent to gain more relevant experience if any

## Future

- Resume tailoring agent
- Auto apply to jobs
- Connect service to an external DB
- Implement RAG to surface relevant candidate history based on job details

The tailoring agent is NOT part of the current MVP.

## User Flow

1. User uploads resume in .docx (.pdf and other format is not supported yet)
2. User enters job link from linkedin 
3. Backend processes the information
4. System presents analysis
5. User reviews results and select which gaps to target
6. Interview agent starts asking question
7. When relevant experience surfaces, the process will be stopped
8. Using new context from gaps, tailor a new resume using same structure and font.

## Non-goals

- Automatically submitting applications
- Fully autonomous job applications
- Resume tailoring in current MVP
- Allow for job description to be uploaded and provide more job link acceptance

## Acceptance Criteria

- Upload errors are clearly surfaced
- Processing state is visible
- API failures do not crash the application