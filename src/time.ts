/**
 * A duration is just a time unit in milliseconds.
 */
export enum Duration {
  Millisecond = 1,
  Microsecond = Duration.Millisecond / 1000,
  Second = Duration.Millisecond * 1000,
  Minute = Duration.Second * 60,
  Hour = Duration.Minute * 60,
  Day = Duration.Hour * 24,
  Week = Duration.Day * 7,
}

function createConverter(targetTimeUnit: number): (duration: number) => number {
  return (duration) => duration / targetTimeUnit;
}

export const durationTo = {
  microsecond: createConverter(Duration.Microsecond),
  millisecond: createConverter(Duration.Millisecond),
  second: createConverter(Duration.Second),
  minute: createConverter(Duration.Minute),
  hour: createConverter(Duration.Hour),
  day: createConverter(Duration.Day),
  week: createConverter(Duration.Week),
};

export function stringify(duration: number, precision = 1): string {
  switch (true) {
    default: {
      let raw = durationTo.week(duration);
      let n = Math.floor(raw);
      let remainder = duration % Duration.Week;
      let fmt = `${n}wk`;
      if (remainder > 0 && precision > 1) {
        fmt += ` ${stringify(remainder, precision - 1)}`;
      }
      return fmt;
    }
    case duration < Duration.Millisecond: {
      return `${durationTo.microsecond(duration).toFixed(2)}µs`;
    }
    case duration < Duration.Second: {
      let raw = durationTo.millisecond(duration);
      let n = Math.floor(raw);
      let remainder = duration % Duration.Millisecond;
      let fmt = `${n}ms`;
      if (remainder > 0 && precision > 1) {
        fmt += ` ${stringify(remainder, precision - 1)}`;
      }
      return fmt;
    }
    case duration < Duration.Minute: {
      let raw = durationTo.second(duration);
      let n = Math.floor(raw);
      let remainder = duration % Duration.Second;
      let fmt = `${n}sec`;
      if (remainder > 0 && precision > 1) {
        fmt += ` ${stringify(remainder, precision - 1)}`;
      }
      return fmt;
    }
    case duration < Duration.Hour: {
      let raw = durationTo.minute(duration);
      let n = Math.floor(raw);
      let remainder = duration % Duration.Minute;
      let fmt = `${n}min`;
      if (remainder > 0 && precision > 1) {
        fmt += ` ${stringify(remainder, precision - 1)}`;
      }
      return fmt;
    }
    case duration < Duration.Day: {
      let raw = durationTo.hour(duration);
      let n = Math.floor(raw);
      let remainder = duration % Duration.Hour;
      let fmt = `${n}hr`;
      if (remainder > 0 && precision > 1) {
        fmt += ` ${stringify(remainder, precision - 1)}`;
      }
      return fmt;
    }
    case duration < Duration.Week: {
      let raw = durationTo.day(duration);
      let n = Math.floor(raw);
      let remainder = duration % Duration.Day;
      let fmt = `${n}day`;
      if (remainder > 0 && precision > 1) {
        fmt += ` ${stringify(remainder, precision - 1)}`;
      }
      return fmt;
    }
  }
}
