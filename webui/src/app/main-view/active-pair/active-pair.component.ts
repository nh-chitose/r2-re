import type { OrderPair, PairWithSummary } from "../../types";
import type { OnInit, OnDestroy } from "@angular/core";
import type { Subscription } from "rxjs/Subscription";

import { Component } from "@angular/core";


import { reviveOrder } from "../../OrderImpl";
import { WsService } from "../../ws.service";

@Component({
  selector: "app-active-pair",
  templateUrl: "./active-pair.component.html",
})
export class ActivePairComponent implements OnInit, OnDestroy {
  private subscription: Subscription;
  pairs: PairWithSummary[] = [];

  constructor(private readonly wsService: WsService) {}

  ngOnInit() {
    this.wsService.connect();
    this.subscription = this.wsService.activePair$.subscribe(pairs => {
      this.pairs = pairs;
      for(const pairWithSummary of this.pairs){
        pairWithSummary.pair = pairWithSummary.pair.map(o => reviveOrder(o)) as OrderPair;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
