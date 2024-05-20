import { Component, Input, OnInit, ViewChild } from '@angular/core'

import { MatSort } from '@angular/material/sort'
import { MatTableDataSource } from '@angular/material/table'
import { Router } from '@angular/router'

import { Compendium } from '@shared/types/compendium'
import { FusionCalculator } from '@shared/types/fusion-calculator'
import { Demon, Fusion } from '@shared/types/smt-tools.types'

/**
 * The component that will display when a user clicks the name of a demon in the
 * demon-list component
 *
 * @class DemonEntryComponent
 * @typedef {DemonEntryComponent}
 * @export
 * @implements {OnInit}
 */
@Component({
	selector: 'app-demon-entry',
	templateUrl: './demon-entry.component.html',
	styleUrls: ['./demon-entry.component.scss'],
})
export class DemonEntryComponent implements OnInit {
	/**
	 * The compendium the demon is from
	 *
	 * @type {Compendium}
	 */
	@Input() declare compendium: Compendium
	/**
	 * The fusion calculator from the demons respective game
	 *
	 * @type {FusionCalculator}
	 */
	@Input() declare calculator: FusionCalculator
	/**
	 * Angular Material object to facilitate sorting
	 *
	 * @type {MatSort}
	 */
	@ViewChild(MatSort) declare sort: MatSort

	/**
	 * The name of the demon the entry is about
	 *
	 * @type {string}
	 */
	declare name: string
	/**
	 * The object of the demon the entry is about
	 *
	 * @type {Demon}
	 */
	declare demon: Demon
	/**
	 * TODO: this isn't represented anywhere on the table, maybe I thought I
	 * would need this later?
	 *
	 * @type {boolean[]}
	 */
	declare inheritTypes: boolean[]
	/**
	 * A list of all the fissions from this demon
	 *
	 * @type {Fusion[]}
	 */
	declare fissions: Fusion[]
	/**
	 * A data source containing all of this demons fissions
	 *
	 * @type {MatTableDataSource<Fusion>}
	 */
	declare fissionSource: MatTableDataSource<Fusion>
	/**
	 * A list of all the fusions this demon takes part in
	 *
	 * @type {Fusion[]}
	 */
	declare fusions: Fusion[]
	/**
	 * A data source for all the fusions this demon takes part in
	 *
	 * @type {MatTableDataSource<Fusion>}
	 */
	declare fusionSource: MatTableDataSource<Fusion>

	/**
	 * Columns to display in the demon's fission table
	 *
	 * @type {{}}
	 */
	displayedFissionColumns = [
		'raceA',
		'levelA',
		'nameA',
		'raceB',
		'nameB',
		'levelB',
		'cost',
	]
	/**
	 * Columns to display in the demon's fusion table
	 *
	 * @type {{}}
	 */
	displayedFusionColumns = [
		'raceB',
		'levelB',
		'nameB',
		'raceResult',
		'nameResult',
		'levelResult',
		'cost',
	]

	constructor(private router: Router) {}

	ngOnInit(): void {
		//get the demon name from the URL
		this.name = this.router.url.split('/')[3]
		if (this.name.includes('%20')) this.name = this.name.replace('%20', ' ')

		//retrieve the necessary data from the game's compendium and store it in the data sources
		this.demon = this.compendium.demons[this.name]
		this.inheritTypes = this.compendium.getInherits(this.demon.inherits!)
		this.fissions = this.calculator.getFissions(this.name)
		this.fissionSource = new MatTableDataSource(this.fissions)
		this.fusions = this.calculator.getFusions(this.name)
		this.fusionSource = new MatTableDataSource(this.fusions)
	}

	//TODO: used to facilitate sorting, but sorting doesn't currently work in this component
	ngAfterViewInit(): void {
		this.fissionSource.sort = this.sort
	}

	/**
	 * TODO: used to facilitate filtering of the table(s), but filtering doesn't
	 * currently work in this component
	 *
	 * @param {Event} event
	 */
	applyFilterFissions(event: Event) {
		const filterValue = (event.target as HTMLInputElement).value
		this.fissionSource.filter = filterValue.trim().toLowerCase()
	}

	/**
	 * TODO: used to facilitate filtering of the table(s), but filtering doesn't
	 * currently work in this component
	 *
	 * @param {Event} event
	 */
	applyFilterFusions(event: Event) {
		const filterValue = (event.target as HTMLInputElement).value
		this.fusionSource.filter = filterValue.trim().toLowerCase()
	}
}
