export interface IIranTalentPosition {
  id?: number
  employment_type?: { title_farsi?: string }
}

export interface IIranTalentSearchState {
  serverSideSearchResult?: {
    data?: { data?: IIranTalentPosition[] }
    boosted_positions?: IIranTalentPosition[]
  }
}
