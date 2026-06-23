export interface Step {
  name: string
  notes: string        // brain dump fallback
  heresWhy?: string    // matches "Here's why:" bullet in the game plan template
  ifYouDont?: string   // matches "If you don't:" bullet
  onceYouDo?: string   // matches "Once you do:" bullet
}

export type ProofItemType = 'testimonial' | 'result' | 'video'

export interface ProofItem {
  type: ProofItemType
  quote?: string        // testimonial
  attribution?: string  // testimonial — e.g. "Sarah M., marriage coach"
  description?: string  // result or video description
  url?: string          // video URL
}

export interface Framework {
  id: string
  frameworkName: string
  stepCount: 3 | 4
  steps: Step[]
  proofItems: ProofItem[]
}

export interface InterviewAnswers {
  q1: string   // prospect full name
  q2: string   // current situation + specific numbers
  q3: string   // dream outcome + their exact goal in their words
  q4: string   // emotional why
  q5: string   // core problem + why current approach can't fix it
  q6: string   // why YOU are the right person (credibility)
  q7: string   // framework name (skipIfFramework)
  q8: string   // solution steps brain dump (skipIfFramework)
  q9: string   // numbers/pricing (optional)
  q10: string  // call to action
}

export type GeneratorMode = 'transcript' | 'interview'
