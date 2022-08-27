import { Component, Input, OnInit } from '@angular/core'
import { CompendiumConfig } from '../../models/compendiumModels'

@Component({
  selector: 'app-normal-fusion-table',
  templateUrl: './normal-fusion-table.component.html',
  styleUrls: ['./normal-fusion-table.component.scss']
})
export class NormalFusionTableComponent implements OnInit {

  @Input() compendiumConfig!: CompendiumConfig

  constructor() { }

  ngOnInit(): void {
    if(this.compendiumConfig === undefined) {
      console.log('Normal Fusion Table must be called with a CompendiumConfig')
      return
    }
  }

}
