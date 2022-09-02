import { Component, Input, OnInit } from '@angular/core'
import { CompendiumConfig } from '@shared/models/compendium'

@Component({
	selector: 'app-element-fusion-table',
	templateUrl: './element-fusion-table.component.html',
	styleUrls: ['./element-fusion-table.component.scss'],
})
export class ElementFusionTableComponent implements OnInit {
	@Input() config: CompendiumConfig | undefined

	constructor() {}

	ngOnInit(): void {
		if (!this.config)
			throw new Error('ElementFusionTable must be called with a game')
		if (!this.config.elementTable) {
			throw new Error(
				'app-element-fusion-table needs a config with a ' +
					' defined elementTable'
			)
		}
	}
}
