export interface IIranTalentPosition {
  id?: number
  employment_type?: { title_farsi?: string }
}

export interface IIranTalentSearchState {
  serverSideSearchResult?: {
    data?: {
      data?: IIranTalentPosition[]
      last_page?: number
    }
    boosted_positions?: IIranTalentPosition[]
  }
}
