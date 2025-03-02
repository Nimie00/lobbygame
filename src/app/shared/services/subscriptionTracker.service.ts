import {Injectable} from '@angular/core';
import {Subscription} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionTrackerService {
  private subscriptionMap: { [key: string]: Subscription[] } = {};

  add(category: string, name: string, subscription: Subscription): void {

    if (!this.subscriptionMap[category]) {
      this.subscriptionMap[category] = [];
    }

    const isDuplicate = this.subscriptionMap[category].some(sub =>
      sub === subscription ||
      (sub.closed === subscription.closed)
    );

    if (!isDuplicate) {
      this.subscriptionMap[category].push(subscription);
      // console.log(`${category} active:`, this.getActiveCount(category), this.getAllActiveSubscriptions());
    } else {
     //  console.log(`Subscription already exists in ${category}`);
    }
  }

  getActiveCount(category: string): number {
    return this.subscriptionMap[category]?.filter(sub => !sub.closed).length || 0;
  }

  getAllActiveSubscriptions(): { [key: string]: number } {
    return Object.keys(this.subscriptionMap).reduce((acc, category) => ({
      ...acc,
      [category]: this.getActiveCount(category)
    }), {});
  }

  // Egy specifikus subscription leiratkozása név alapján
  unsubscribe(category: string, _: string): void {
    if (this.subscriptionMap[category]) {
      const subIndex = this.subscriptionMap[category].findIndex(sub => !sub.closed);
      if (subIndex !== -1) {
        this.subscriptionMap[category][subIndex].unsubscribe();
        this.subscriptionMap[category].splice(subIndex, 1);
       // console.log(`Unsubscribed ${category}/${name}. Active:`, this.getAllActiveSubscriptions());
      }
    }
  }

  // Egy kategória összes subscription-jének leiratkozása
  unsubscribeCategory(category: string): void {
    if (this.subscriptionMap[category]) {
     // console.log(this.subscriptionMap[category]);
      this.subscriptionMap[category].forEach(sub => sub.unsubscribe());
      this.subscriptionMap[category] = [];
    //  console.log(`Unsubscribed category ${category}. Active:`, this.getAllActiveSubscriptions());
    }
  }

  // Minden subscription leiratkozása
  unsubscribeAll(): void {
   //  console.log("Unsubing from all")
    Object.keys(this.subscriptionMap).forEach(category => {
    //   console.log("Category: " + category)
      this.unsubscribeCategory(category);
    });
  }
}
